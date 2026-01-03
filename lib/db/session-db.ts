import { performance } from "perf_hooks";
import { getSupabase, isDuplicateError, handleDbError, logDbTiming } from "./client";

// =============================================================================
// Upload Session Interfaces
// =============================================================================

export interface UploadSessionRecord {
    code: string;
    storage_key: string;
    original_name: string;
    size: number;
    mime_type: string;
    expires_at: string;
    max_downloads: number;
    password_hash: string | null;
    session_expires_at: string;
    created_at?: string;
}

// =============================================================================
// Upload Session Operations
// =============================================================================

export async function reserveUploadSession(session: UploadSessionRecord): Promise<boolean> {
    const supabase = getSupabase();
    const start = performance.now();
    const { error } = await supabase
        .from("upload_sessions")
        .insert({
            code: session.code,
            storage_key: session.storage_key,
            original_name: session.original_name,
            size: session.size,
            mime_type: session.mime_type,
            expires_at: session.expires_at,
            max_downloads: session.max_downloads,
            password_hash: session.password_hash,
            session_expires_at: session.session_expires_at,
        });
    logDbTiming("upload_sessions.insert", start);

    if (!error) return true;
    if (isDuplicateError(error)) return false;
    handleDbError(error, "Failed to reserve upload session");
}

export async function getUploadSession(code: string): Promise<UploadSessionRecord | null> {
    const supabase = getSupabase();
    const start = performance.now();
    const { data, error } = await supabase
        .from("upload_sessions")
        .select("*")
        .eq("code", code)
        .maybeSingle();
    logDbTiming("upload_sessions.select", start);

    if (error) {
        handleDbError(error, "Failed to read upload session");
    }

    return data as UploadSessionRecord | null;
}

export async function deleteUploadSession(code: string): Promise<void> {
    const supabase = getSupabase();
    const start = performance.now();
    const { error } = await supabase
        .from("upload_sessions")
        .delete()
        .eq("code", code);
    logDbTiming("upload_sessions.delete", start);

    if (error) {
        handleDbError(error, "Failed to delete upload session");
    }
}

// =============================================================================
// Atomic Operations
// =============================================================================

export interface FileRecord {
    id: string;
    code: string;
    storage_key: string;
    original_name: string;
    size: number;
    mime_type: string;
    expires_at: string;
    max_downloads: number;
    download_count: number;
    password_hash: string | null;
    downloaded: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * Finalize an upload session atomically (move from upload_sessions to file_metadata).
 * Uses PostgreSQL function to ensure session delete + file create happen together.
 * Returns null if session expired/not found or duplicate finalization.
 */
export async function finalizeUploadAtomic(code: string): Promise<FileRecord | null> {
    const supabase = getSupabase();
    const start = performance.now();

    const { data, error } = await supabase.rpc("finalize_upload_atomic", {
        p_code: code,
    });
    logDbTiming("rpc.finalize_upload_atomic", start);

    if (error) {
        handleDbError(error, "Failed to finalize upload atomically");
    }

    // RPC returns array of rows, empty if session not found or duplicate
    if (!data || data.length === 0) {
        return null;
    }

    return data[0] as FileRecord;
}
