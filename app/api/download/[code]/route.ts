import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { r2Storage } from "@/lib/r2";
import { logger } from "@/lib/logger";
import { StorageError, ValidationError, formatErrorResponse } from "@/lib/errors";
import { CODE_LENGTH } from "@/lib/constants";
import { verifyPassword } from "@/lib/passwords";
import type { FileMetadata } from "@/types";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

function jsonResponse(data: Record<string, unknown>, init: ResponseInit = {}) {
    return NextResponse.json(data, {
        ...init,
        headers: {
            ...NO_STORE_HEADERS,
            ...(init.headers || {}),
        },
    });
}

function isValidCode(code: string): boolean {
    return code.length === CODE_LENGTH && /^[0-9]+$/.test(code);
}

function normalizeMetadata(raw: unknown): FileMetadata {
    if (!raw || typeof raw !== "object") {
        throw new StorageError("Invalid metadata");
    }
    const data = raw as Partial<FileMetadata>;

    const filename = typeof data.filename === "string" ? data.filename : "";
    const originalName = typeof data.originalName === "string" ? data.originalName : "";
    const mimeType = typeof data.mimeType === "string" ? data.mimeType : "application/octet-stream";
    const size = typeof data.size === "number" && Number.isFinite(data.size) ? data.size : 0;
    const expiresAtRaw = (data as { expiresAt?: unknown }).expiresAt;
    const expiresAt = expiresAtRaw instanceof Date
        ? expiresAtRaw.toISOString()
        : typeof expiresAtRaw === "string"
            ? expiresAtRaw
            : "";
    const maxDownloads = typeof data.maxDownloads === "number" && Number.isFinite(data.maxDownloads)
        ? data.maxDownloads
        : -1;
    const downloadCount = typeof data.downloadCount === "number" && Number.isFinite(data.downloadCount)
        ? data.downloadCount
        : 0;
    const password = typeof data.password === "string" ? data.password : null;

    if (!filename || !originalName || size <= 0 || !expiresAt) {
        throw new StorageError("Invalid metadata", 500);
    }

    if (maxDownloads < -1 || downloadCount < 0) {
        throw new StorageError("Invalid download limits", 500);
    }

    const expiresDate = new Date(expiresAt);
    if (Number.isNaN(expiresDate.getTime())) {
        throw new StorageError("Invalid expiry", 500);
    }

    return {
        storageType: data.storageType === "r2" ? "r2" : "r2",
        filename,
        originalName,
        size,
        mimeType,
        expiresAt,
        maxDownloads,
        downloadCount,
        password,
        downloaded: Boolean(data.downloaded),
    };
}

async function cleanupExpired(code: string, filename: string): Promise<void> {
    try {
        await r2Storage.deleteFile(filename);
        await r2Storage.deleteFile(`${code}.metadata.json`);
    } catch (error) {
        logger.exception("Failed to delete expired file", error, { code });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const requestId = crypto.randomUUID().slice(0, 8);

    try {
        const { code } = await params;

        if (!isValidCode(code)) {
            throw new ValidationError("Invalid code format", "code");
        }

        if (!r2Storage.isConfigured()) {
            throw new StorageError("Storage not configured");
        }

        const fileInfo = await r2Storage.getMetadata(code);
        if (!fileInfo) {
            return jsonResponse({ error: "File not found or expired" }, { status: 404 });
        }

        const metadata = normalizeMetadata(fileInfo);
        const expiresAt = new Date(metadata.expiresAt);

        if (new Date() > expiresAt) {
            await cleanupExpired(code, metadata.filename);
            return jsonResponse({ error: "File has expired" }, { status: 410 });
        }

        if (metadata.maxDownloads !== -1 && metadata.downloadCount >= metadata.maxDownloads) {
            await cleanupExpired(code, metadata.filename);
            return jsonResponse({ error: "Download limit reached" }, { status: 410 });
        }

        return jsonResponse({
            name: metadata.originalName,
            size: metadata.size,
            expiresAt: metadata.expiresAt,
            requiresPassword: metadata.password !== null,
            downloadsRemaining: metadata.maxDownloads === -1
                ? "unlimited"
                : Math.max(metadata.maxDownloads - metadata.downloadCount, 0),
        });
    } catch (error) {
        logger.exception("Download metadata error", error, { requestId });
        const { error: errorMessage, statusCode } = formatErrorResponse(error);
        return jsonResponse({ error: errorMessage }, { status: statusCode });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const requestId = crypto.randomUUID().slice(0, 8);

    try {
        const { code } = await params;

        if (!isValidCode(code)) {
            throw new ValidationError("Invalid code format", "code");
        }

        if (!r2Storage.isConfigured()) {
            throw new StorageError("Storage not configured");
        }

        const body = await request.json().catch(() => ({}));
        const providedPassword = typeof body.password === "string" ? body.password : null;

        const maxAttempts = 3;
        let attempt = 0;
        let metadata: FileMetadata | null = null;
        let shouldDelete = false;

        while (attempt < maxAttempts) {
            const record = await r2Storage.getMetadataWithEtag(code);
            if (!record) {
                return jsonResponse({ error: "File not found or expired" }, { status: 404 });
            }

            const normalized = normalizeMetadata(record.metadata);
            const expiresAt = new Date(normalized.expiresAt);

            if (new Date() > expiresAt) {
                await cleanupExpired(code, normalized.filename);
                return jsonResponse({ error: "File has expired" }, { status: 410 });
            }

            if (normalized.maxDownloads !== -1 && normalized.downloadCount >= normalized.maxDownloads) {
                await cleanupExpired(code, normalized.filename);
                return jsonResponse({ error: "Download limit reached" }, { status: 410 });
            }

            if (normalized.password) {
                if (!providedPassword) {
                    return jsonResponse({ error: "Password required" }, { status: 401 });
                }
                if (!verifyPassword(providedPassword, normalized.password)) {
                    return jsonResponse({ error: "Incorrect password" }, { status: 403 });
                }
            }

            const updated: FileMetadata = {
                ...normalized,
                downloadCount: normalized.downloadCount + 1,
                downloaded: true,
            };

            shouldDelete = updated.maxDownloads !== -1 && updated.downloadCount >= updated.maxDownloads;

            try {
                await r2Storage.saveMetadata(code, updated, { ifMatch: record.etag });
                metadata = updated;
                break;
            } catch (err) {
                if (err instanceof StorageError && err.statusCode === 409) {
                    attempt++;
                    continue;
                }
                throw err;
            }
        }

        if (!metadata) {
            return jsonResponse({ error: "Download busy, retry" }, { status: 409 });
        }

        const stream = await r2Storage.downloadStream(metadata.filename);

        if (shouldDelete) {
            await r2Storage.deleteFile(metadata.filename);
            await r2Storage.deleteFile(`${code}.metadata.json`);
        }

        return new NextResponse(stream, {
            headers: {
                ...NO_STORE_HEADERS,
                "Content-Type": metadata.mimeType || "application/octet-stream",
                "Content-Disposition": `attachment; filename="${encodeURIComponent(metadata.originalName)}"`,
                "Content-Length": metadata.size.toString(),
            },
        });
    } catch (error) {
        logger.exception("Download error", error, { requestId });
        const { error: errorMessage, statusCode } = formatErrorResponse(error);
        return jsonResponse({ error: errorMessage }, { status: statusCode });
    }
}
