import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { r2Storage } from "@/lib/r2";
import { logger } from "@/lib/logger";
import { ValidationError, StorageError, formatErrorResponse } from "@/lib/errors";
import {
    MAX_UPLOAD_SIZE,
    MAX_FILE_SIZE,
    CODE_LENGTH,
    DEFAULT_EXPIRY_MINUTES,
    DEFAULT_MAX_DOWNLOADS,
    MAX_EXPIRY_MINUTES,
    ALLOWED_MIME_TYPES,
    ALLOWED_MAX_DOWNLOADS,
} from "@/lib/constants";
import { hashPassword } from "@/lib/passwords";
import type { FileMetadata } from "@/types";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

// Generate a numeric code
function generateCode(): string {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
        code += crypto.randomInt(0, 10).toString();
    }
    return code;
}

function isAllowedMimeType(mimeType: string): boolean {
    if (!mimeType) return false;
    return ALLOWED_MIME_TYPES.some((allowed) => {
        if (allowed.endsWith("/*")) {
            return mimeType.startsWith(allowed.slice(0, -1));
        }
        return mimeType === allowed;
    });
}

// Sanitize filename to prevent path traversal
function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[/\\]/g, "_") // Replace slashes
        .replace(/\.\./g, "_") // Prevent path traversal
        .replace(/[<>:"|?*]/g, "_") // Remove invalid chars
        .slice(0, 255); // Limit length
}

export async function POST(request: NextRequest) {
    const requestId = crypto.randomUUID().slice(0, 8);

    try {
        const formData = await request.formData();
        const files = formData.getAll("files") as File[];
        const expiryRaw = Number.parseInt(formData.get("expiryMinutes") as string, 10);
        const maxDownloadsRaw = Number.parseInt(formData.get("maxDownloads") as string, 10);
        const password = (formData.get("password") as string | null)?.trim() || null;
        const expiryMinutes = Number.isFinite(expiryRaw)
            ? Math.min(Math.max(expiryRaw, 1), MAX_EXPIRY_MINUTES)
            : DEFAULT_EXPIRY_MINUTES;
        const maxDownloads = ALLOWED_MAX_DOWNLOADS.includes(maxDownloadsRaw as (typeof ALLOWED_MAX_DOWNLOADS)[number])
            ? maxDownloadsRaw
            : DEFAULT_MAX_DOWNLOADS;

        // Validation
        if (files.length === 0) {
            throw new ValidationError("No files provided", "files");
        }
        if (files.length !== 1) {
            throw new ValidationError("Only one file per upload is supported", "files");
        }

        const file = files[0];
        if (!file.name) {
            throw new ValidationError("Invalid file name", "files");
        }
        if (file.size > MAX_FILE_SIZE) {
            throw new ValidationError(
                `File size exceeds ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB limit`,
                "files"
            );
        }

        const totalSize = file.size;
        if (totalSize > MAX_UPLOAD_SIZE) {
            throw new ValidationError(
                `Total file size exceeds ${Math.round(MAX_UPLOAD_SIZE / 1024 / 1024)} MB limit`,
                "files"
            );
        }

        const mimeType = file.type || "application/octet-stream";
        if (!isAllowedMimeType(mimeType)) {
            throw new ValidationError("File type is not allowed", "files");
        }

        // Check storage availability
        if (!r2Storage.isConfigured()) {
            throw new StorageError("Storage not configured");
        }

        // Generate unique code
        let code = generateCode();
        let attempts = 0;
        while (await r2Storage.getMetadata(code) && attempts < 10) {
            code = generateCode();
            attempts++;
        }
        if (attempts >= 10) {
            throw new StorageError("Failed to generate unique code");
        }

        // Determine file name and prepare buffer
        let fileName = sanitizeFilename(file.name);
        if (!fileName) {
            fileName = "upload.bin";
        }

        // Calculate expiry
        const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

        logger.info("Starting file upload", {
            requestId,
            fileCount: files.length,
            totalSize,
            expiryMinutes,
        });

        try {
            // Use code + random + filename to avoid collisions
            const randomSuffix = crypto.randomBytes(4).toString("hex");
            const key = `${code}-${randomSuffix}-${fileName}`;

            // 1. Upload Content
            await r2Storage.uploadFile(file.stream(), key, mimeType, { size: totalSize });

            logger.debug("File uploaded to R2", { requestId, key });

            // 2. Upload Metadata
            const metadata: FileMetadata = {
                storageType: "r2",
                filename: key,
                originalName: fileName,
                size: totalSize,
                mimeType,
                expiresAt: expiresAt.toISOString(),
                maxDownloads,
                downloadCount: 0,
                password: password ? hashPassword(password) : null,
                downloaded: false,
            };

            await r2Storage.saveMetadata(code, metadata);

            logger.info("Upload complete", { requestId, code });

            return NextResponse.json({
                code,
                expiresAt: expiresAt.toISOString(),
                storageType: "r2",
            }, { headers: NO_STORE_HEADERS });
        } catch (error) {
            logger.exception("R2 upload failed", error, { requestId });
            throw new StorageError(
                error instanceof Error ? error.message : "Upload failed"
            );
        }
    } catch (error) {
        logger.exception("Upload error", error, { requestId });
        const { error: errorMessage, statusCode } = formatErrorResponse(error);
        return NextResponse.json(
            { error: errorMessage },
            { status: statusCode, headers: NO_STORE_HEADERS }
        );
    }
}
