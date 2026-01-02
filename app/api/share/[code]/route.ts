import { NextRequest, NextResponse } from "next/server";
import { r2Storage } from "@/lib/r2";
import { ShareMetadata } from "@/lib/share-types";
import { StorageError, ValidationError, formatErrorResponse } from "@/lib/errors";
import { verifyPassword } from "@/lib/passwords";
import { SHARE_CODE_LENGTH } from "@/lib/constants";

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
    return code.length === SHARE_CODE_LENGTH && /^[a-z0-9]+$/.test(code);
}

function normalizeMetadata(raw: unknown): ShareMetadata {
    if (!raw || typeof raw !== "object") {
        throw new StorageError("Invalid share metadata");
    }
    const data = raw as Partial<ShareMetadata>;

    const content = typeof data.content === "string" ? data.content : "";
    const type = typeof data.type === "string" ? data.type : "";
    const expiresAtRaw = (data as { expiresAt?: unknown }).expiresAt;
    const expiresAt = expiresAtRaw instanceof Date
        ? expiresAtRaw.toISOString()
        : typeof expiresAtRaw === "string"
            ? expiresAtRaw
            : "";
    const createdAtRaw = (data as { createdAt?: unknown }).createdAt;
    const createdAt = createdAtRaw instanceof Date
        ? createdAtRaw.toISOString()
        : typeof createdAtRaw === "string"
            ? createdAtRaw
            : "";
    const viewCount = typeof data.viewCount === "number" && Number.isFinite(data.viewCount)
        ? data.viewCount
        : 0;

    if (!content || !type || !expiresAt) {
        throw new StorageError("Invalid share metadata", 500);
    }

    if (viewCount < 0) {
        throw new StorageError("Invalid view count", 500);
    }

    const expiresDate = new Date(expiresAt);
    if (Number.isNaN(expiresDate.getTime())) {
        throw new StorageError("Invalid expiry", 500);
    }

    return {
        type: data.type as ShareMetadata["type"],
        content,
        originalName: typeof data.originalName === "string" ? data.originalName : undefined,
        mimeType: typeof data.mimeType === "string" ? data.mimeType : undefined,
        size: typeof data.size === "number" ? data.size : undefined,
        language: typeof data.language === "string" ? data.language : undefined,
        expiresAt,
        password: typeof data.password === "string" ? data.password : null,
        burnAfterReading: Boolean(data.burnAfterReading),
        viewCount,
        burned: Boolean(data.burned),
        createdAt: createdAt || new Date().toISOString(),
    };
}

async function cleanupExpired(code: string): Promise<void> {
    try {
        await r2Storage.deleteShareMetadata(code);
    } catch (error) {
        console.error("Error deleting expired share:", error);
    }
}

async function processShare(
    code: string,
    providedPassword: string | null
): Promise<ShareMetadata | Response> {
    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
        const record = await r2Storage.getShareMetadataWithEtag(code);
        if (!record) {
            return jsonResponse({ error: "Share not found" }, { status: 404 });
        }

        const metadata = normalizeMetadata(record.metadata);
        const expiresAt = new Date(metadata.expiresAt);

        if (new Date(expiresAt) < new Date()) {
            await cleanupExpired(code);
            return jsonResponse({ error: "Share has expired" }, { status: 410 });
        }

        if (metadata.burned) {
            return jsonResponse({ error: "This share has been destroyed" }, { status: 410 });
        }

        if (metadata.password) {
            if (!providedPassword) {
                return jsonResponse({
                    error: "Password required",
                    requiresPassword: true,
                    type: metadata.type,
                    burnAfterReading: metadata.burnAfterReading,
                }, { status: 401 });
            }
            if (!verifyPassword(providedPassword, metadata.password)) {
                return jsonResponse({ error: "Incorrect password" }, { status: 403 });
            }
        }

        const updated: ShareMetadata = {
            ...metadata,
            viewCount: metadata.viewCount + 1,
            burned: metadata.burned || metadata.burnAfterReading,
        };

        try {
            await r2Storage.saveShareMetadata(code, updated, { ifMatch: record.etag });
            return updated;
        } catch (err) {
            if (err instanceof StorageError && err.statusCode === 409) {
                attempt++;
                continue;
            }
            throw err;
        }
    }

    return jsonResponse({ error: "Share busy, retry" }, { status: 409 });
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;
        const normalizedCode = code?.toLowerCase() || "";
        if (!isValidCode(normalizedCode)) {
            throw new ValidationError("Invalid share code", "code");
        }

        if (!r2Storage.isConfigured()) {
            return jsonResponse({ error: "Storage not configured" }, { status: 500 });
        }

        const result = await processShare(normalizedCode, null);
        if (result instanceof Response) {
            return result;
        }

        return jsonResponse({
            type: result.type,
            content: result.content,
            language: result.language,
            originalName: result.originalName,
            mimeType: result.mimeType,
            expiresAt: result.expiresAt,
            burnAfterReading: result.burnAfterReading,
            burned: result.burned,
            requiresPassword: !!result.password,
        });
    } catch (error) {
        console.error("Share retrieval error:", error);
        const { error: errorMessage, statusCode } = formatErrorResponse(error);
        return jsonResponse({ error: errorMessage }, { status: statusCode });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;
        const normalizedCode = code?.toLowerCase() || "";
        if (!isValidCode(normalizedCode)) {
            throw new ValidationError("Invalid share code", "code");
        }

        if (!r2Storage.isConfigured()) {
            return jsonResponse({ error: "Storage not configured" }, { status: 500 });
        }

        const body = await request.json().catch(() => ({}));
        const providedPassword = typeof body.password === "string" ? body.password : null;

        const result = await processShare(normalizedCode, providedPassword);
        if (result instanceof Response) {
            return result;
        }

        return jsonResponse({
            type: result.type,
            content: result.content,
            language: result.language,
            originalName: result.originalName,
            mimeType: result.mimeType,
            expiresAt: result.expiresAt,
            burnAfterReading: result.burnAfterReading,
            burned: result.burned,
            requiresPassword: !!result.password,
        });
    } catch (error) {
        console.error("Share retrieval error:", error);
        const { error: errorMessage, statusCode } = formatErrorResponse(error);
        return jsonResponse({ error: errorMessage }, { status: statusCode });
    }
}
