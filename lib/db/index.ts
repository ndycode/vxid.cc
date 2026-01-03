/**
 * Database Access Layer - Barrel Export
 *
 * This module re-exports all database operations from domain-specific modules.
 * Each domain module handles a specific entity type:
 * - session-db.ts: Upload session management
 * - file-db.ts: File metadata operations
 * - share-db.ts: Share content and metadata
 * - token-db.ts: Download tokens
 *
 * The domain split reduces blast radius:
 * - Changes to share logic don't affect file operations
 * - Token handling is isolated from upload sessions
 * - Each module can evolve independently
 */

// Client utilities (for direct Supabase access if needed)
export { getSupabase, isValidUUID, validateUUID } from "./client";

// Upload Session operations
export {
    type UploadSessionRecord,
    reserveUploadSession,
    getUploadSession,
    deleteUploadSession,
    finalizeUploadAtomic,
} from "./session-db";

// File Metadata operations
export {
    type FileRecord,
    createFileMetadataFromSession,
    getFileByCode,
    getFileById,
    updateFileDownloadCount,
    deleteFileById,
} from "./file-db";

// Share operations
// NOTE: createShareContent, deleteShareContent, createShareRecord are NOT exported.
// Use createShareAtomic to ensure share_contents and shares are created atomically.
// This prevents orphaned share_contents if a crash occurs between the two inserts.
export {
    type ShareContentRecord,
    type ShareRecord,
    type ShareWithContentRecord,
    type CreateShareAtomicParams,
    type CreateShareAtomicResult,
    getShareWithContentByCode,
    updateShareViewCount,
    createShareAtomic,
} from "./share-db";

// Download Token operations
export {
    type DownloadTokenRecord,
    createDownloadToken,
    consumeDownloadToken,
    deleteAndReturnDownloadToken,
    getDownloadToken,
} from "./token-db";
