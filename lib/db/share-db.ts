import { performance } from "perf_hooks";
import { getSupabase, isDuplicateError, handleDbError, logDbTiming, validateUUID } from "./client";
import { logger } from "../logger";

// =============================================================================
// Share Interfaces
// =============================================================================

export interface ShareContentRecord {
    id: string;
    content: string;
    created_at: string;
}

export interface ShareRecord {
    id: string;
    code: string;
    type: string;
    content_id: string;
    original_name: string | null;
    mime_type: string | null;
    size: number | null;
    language: string | null;
    expires_at: string;
    password_hash: string | null;
    burn_after_reading: boolean;
    view_count: number;
    burned: boolean;
    created_at: string;
}

export interface ShareWithContentRecord extends ShareRecord {
    content: ShareContentRecord | null;
}

// =============================================================================
// Share Content Operations
// =============================================================================

export async function createShareContent(content: string): Promise<ShareContentRecord> {
    const supabase = getSupabase();
    const start = performance.now();
    const { data, error } = await supabase
        .from("share_contents")
        .insert({ content })
        .select("*");
    logDbTiming("share_contents.insert", start);

    if (error) {
        handleDbError(error, "Failed to save share content");
    }

    const record = data?.[0] as ShareContentRecord | undefined;
    if (!record) {
        throw new Error("Share content was not created");
    }
    return record;
}

export async function deleteShareContent(id: string): Promise<void> {
    validateUUID(id, "share_contents.id");
    const supabase = getSupabase();
    const start = performance.now();
    const { error } = await supabase
        .from("share_contents")
        .delete()
        .eq("id", id);
    logDbTiming("share_contents.delete", start);

    if (error) {
        handleDbError(error, "Failed to delete share content");
    }
    logger.debug("Deleted share content", { id });
}

// =============================================================================
// Share Record Operations
// =============================================================================

export async function createShareRecord(
    record: Omit<ShareRecord, "id" | "created_at">
): Promise<ShareRecord | null> {
    const supabase = getSupabase();
    const start = performance.now();
    const { data, error } = await supabase
        .from("shares")
        .insert({
            code: record.code,
            type: record.type,
            content_id: record.content_id,
            original_name: record.original_name,
            mime_type: record.mime_type,
            size: record.size,
            language: record.language,
            expires_at: record.expires_at,
            password_hash: record.password_hash,
            burn_after_reading: record.burn_after_reading,
            view_count: record.view_count,
            burned: record.burned,
        })
        .select("*");
    logDbTiming("shares.insert", start);

    if (!error) {
        return data?.[0] as ShareRecord | null;
    }
    if (isDuplicateError(error)) return null;
    handleDbError(error, "Failed to save share metadata");
}

export async function getShareWithContentByCode(code: string): Promise<ShareWithContentRecord | null> {
    const supabase = getSupabase();
    const start = performance.now();
    const { data, error } = await supabase
        .from("shares")
        .select("*, content:share_contents(*)")
        .eq("code", code)
        .maybeSingle();
    logDbTiming("shares.select_code", start);

    if (error) {
        handleDbError(error, "Failed to fetch share metadata");
    }

    if (!data) return null;

    const content = Array.isArray(data.content) ? data.content[0] : data.content;
    return { ...(data as ShareRecord), content: content as ShareContentRecord | null };
}

export async function updateShareViewCount(
    id: string,
    expectedCount: number,
    burnAfterReading: boolean
): Promise<ShareRecord | null> {
    const supabase = getSupabase();
    const start = performance.now();
    const { data, error } = await supabase
        .from("shares")
        .update({
            view_count: expectedCount + 1,
            burned: burnAfterReading ? true : undefined,
        })
        .eq("id", id)
        .eq("view_count", expectedCount)
        .select("*");
    logDbTiming("shares.update_view", start);

    if (error) {
        handleDbError(error, "Failed to update share view count");
    }

    return data?.[0] as ShareRecord | null;
}

// =============================================================================
// Atomic Operations
// =============================================================================

export interface CreateShareAtomicParams {
    content: string;
    code: string;
    type: string;
    original_name?: string | null;
    mime_type?: string | null;
    size?: number | null;
    language?: string | null;
    expires_at: string;
    password_hash?: string | null;
    burn_after_reading?: boolean;
}

export interface CreateShareAtomicResult {
    share_id: string;
    content_id: string;
    code: string;
    created_at: string;
}

/**
 * Create a share atomically (share_contents + shares in single transaction).
 * Uses PostgreSQL function to ensure both inserts succeed or both fail.
 * Returns null if code collision (caller should retry with new code).
 */
export async function createShareAtomic(
    params: CreateShareAtomicParams
): Promise<CreateShareAtomicResult | null> {
    const supabase = getSupabase();
    const start = performance.now();

    const { data, error } = await supabase.rpc("create_share_atomic", {
        p_content: params.content,
        p_code: params.code,
        p_type: params.type,
        p_original_name: params.original_name ?? null,
        p_mime_type: params.mime_type ?? null,
        p_size: params.size ?? null,
        p_language: params.language ?? null,
        p_expires_at: params.expires_at,
        p_password_hash: params.password_hash ?? null,
        p_burn_after_reading: params.burn_after_reading ?? false,
    });
    logDbTiming("rpc.create_share_atomic", start);

    if (error) {
        handleDbError(error, "Failed to create share atomically");
    }

    // RPC returns array of rows, empty if code collision
    if (!data || data.length === 0) {
        return null;
    }

    return data[0] as CreateShareAtomicResult;
}
