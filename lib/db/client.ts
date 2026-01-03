import "server-only";

// Defense-in-depth: runtime check to catch misconfiguration
if (typeof window !== "undefined") {
    throw new Error("Database module cannot be imported on the client side");
}

import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { performance } from "perf_hooks";
import { env } from "../env";
import { logger } from "../logger";
import { StorageError, ValidationError } from "../errors";

// =============================================================================
// UUID Validation
// =============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
    return UUID_REGEX.test(id);
}

export function validateUUID(id: string, context: string): void {
    if (!id || !isValidUUID(id)) {
        throw new ValidationError(`Invalid UUID for ${context}: ${id || "(empty)"}`);
    }
}

// =============================================================================
// Supabase Client
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Database = any;

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabase() {
    if (!env.SUPABASE_URL) {
        throw new StorageError("Database not configured: SUPABASE_URL is not set");
    }
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new StorageError("Database not configured: SUPABASE_SERVICE_ROLE_KEY is not set");
    }

    if (!supabaseClient) {
        supabaseClient = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false },
        });
    }

    return supabaseClient;
}

// =============================================================================
// Error Handling Utilities
// =============================================================================

export function isDuplicateError(error: PostgrestError): boolean {
    return error.code === "23505";
}

export function handleDbError(error: PostgrestError, message: string): never {
    logger.error(message, { code: error.code, details: error.details, hint: error.hint });
    throw new StorageError(message);
}

export function logDbTiming(label: string, start: number) {
    const durationMs = performance.now() - start;
    logger.debug("db.timing", { label, durationMs: Math.round(durationMs) });
}

// Re-export types needed by other db modules
export type { PostgrestError };
