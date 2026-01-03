import { performance } from "perf_hooks";
import { getSupabase, isDuplicateError, handleDbError, logDbTiming, validateUUID } from "./client";
import { logger } from "../logger";
import type { UploadSessionRecord } from "./session-db";

// =============================================================================
// File Record Interface
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

// =============================================================================
// File Metadata Operations
// =============================================================================

export async function createFileMetadataFromSession(
    session: UploadSessionRecord
): Promise<FileRecord | null> {
    const supabase = getSupabase();
    const start = performance.now();
    const { data, error } = await supabase
        .from("file_metadata")
        .insert({
            code: session.code,
            storage_key: session.storage_key,
            original_name: session.original_name,
            size: session.size,
            mime_type: session.mime_type,
            expires_at: session.expires_at,
            max_downloads: session.max_downloads,
            password_hash: session.password_hash,
            downloaded: false,
        })
        .select("*");
    logDbTiming("file_metadata.insert", start);

    if (!error) {
        return data?.[0] as FileRecord | null;
    }
    if (isDuplicateError(error)) return null;
    handleDbError(error, "Failed to save file metadata");
}

export async function getFileByCode(code: string): Promise<FileRecord | null> {
    const supabase = getSupabase();
    const start = performance.now();
    const { data, error } = await supabase
        .from("file_metadata")
        .select("*")
        .eq("code", code)
        .maybeSingle();
    logDbTiming("file_metadata.select_code", start);

    if (error) {
        handleDbError(error, "Failed to fetch file metadata");
    }

    return data as FileRecord | null;
}

export async function getFileById(id: string): Promise<FileRecord | null> {
    const supabase = getSupabase();
    const start = performance.now();
    const { data, error } = await supabase
        .from("file_metadata")
        .select("*")
        .eq("id", id)
        .maybeSingle();
    logDbTiming("file_metadata.select_id", start);

    if (error) {
        handleDbError(error, "Failed to fetch file metadata");
    }

    return data as FileRecord | null;
}

export async function updateFileDownloadCount(
    id: string,
    expectedCount: number,
    nextCount: number
): Promise<FileRecord | null> {
    const supabase = getSupabase();
    const start = performance.now();
    const { data, error } = await supabase
        .from("file_metadata")
        .update({
            download_count: nextCount,
            downloaded: true,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("download_count", expectedCount)
        .select("*");
    logDbTiming("file_metadata.update_download", start);

    if (error) {
        handleDbError(error, "Failed to update download count");
    }

    return data?.[0] as FileRecord | null;
}

export async function deleteFileById(id: string): Promise<void> {
    validateUUID(id, "file_metadata.id");
    const supabase = getSupabase();
    const start = performance.now();
    const { error } = await supabase
        .from("file_metadata")
        .delete()
        .eq("id", id);
    logDbTiming("file_metadata.delete", start);

    if (error) {
        handleDbError(error, "Failed to delete file metadata");
    }
    logger.debug("Deleted file metadata", { id });
}
