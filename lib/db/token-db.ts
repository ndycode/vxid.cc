import { performance } from "perf_hooks";
import { getSupabase, handleDbError, logDbTiming } from "./client";
import { logger } from "../logger";
import { ValidationError } from "../errors";

// =============================================================================
// Download Token Interface
// =============================================================================

export interface DownloadTokenRecord {
    token: string;
    file_id: string;
    code: string;
    delete_after: boolean;
    expires_at: string;
    created_at: string;
}

// =============================================================================
// Download Token Operations
// =============================================================================

export async function createDownloadToken(record: Omit<DownloadTokenRecord, "created_at">): Promise<void> {
    const supabase = getSupabase();
    const start = performance.now();
    const { error } = await supabase
        .from("download_tokens")
        .insert({
            token: record.token,
            file_id: record.file_id,
            code: record.code,
            delete_after: record.delete_after,
            expires_at: record.expires_at,
        });
    logDbTiming("download_tokens.insert", start);

    if (error) {
        handleDbError(error, "Failed to create download token");
    }
}

/**
 * Delete a download token and return its data.
 * WARNING: This operation is destructive - the token is deleted immediately.
 * Use getDownloadToken() for read-only access if you don't want to consume it.
 * @deprecated Use deleteAndReturnDownloadToken for clearer intent
 */
export async function consumeDownloadToken(token: string): Promise<DownloadTokenRecord | null> {
    return deleteAndReturnDownloadToken(token);
}

/**
 * Delete a download token and return its data.
 * WARNING: This operation is destructive - the token is deleted immediately.
 * For read-only access without deletion, use getDownloadToken() first.
 */
export async function deleteAndReturnDownloadToken(token: string): Promise<DownloadTokenRecord | null> {
    if (!token) {
        throw new ValidationError("token is required for token deletion");
    }
    const supabase = getSupabase();
    const start = performance.now();
    const { data, error } = await supabase
        .from("download_tokens")
        .delete()
        .eq("token", token)
        .select("*");
    logDbTiming("download_tokens.delete", start);

    if (error) {
        handleDbError(error, "Failed to delete download token");
    }

    const result = data?.[0] as DownloadTokenRecord | null;
    if (result) {
        logger.debug("Deleted and returned download token", { token: token.slice(0, 8) + "..." });
    }
    return result;
}

/**
 * Get a download token without deleting it.
 * Use this for read-only validation before consuming.
 */
export async function getDownloadToken(token: string): Promise<DownloadTokenRecord | null> {
    if (!token) {
        return null;
    }
    const supabase = getSupabase();
    const start = performance.now();
    const { data, error } = await supabase
        .from("download_tokens")
        .select("*")
        .eq("token", token)
        .maybeSingle();
    logDbTiming("download_tokens.select", start);

    if (error) {
        handleDbError(error, "Failed to fetch download token");
    }

    return data as DownloadTokenRecord | null;
}
