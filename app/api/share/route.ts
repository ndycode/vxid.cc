import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { r2Storage } from "@/lib/r2";
import { ShareMetadata, CreateShareRequest, ShareType } from "@/lib/share-types";
import {
    SHARE_CODE_LENGTH,
    MAX_SHARE_TEXT_SIZE,
    MAX_SHARE_IMAGE_BYTES,
    MAX_SHARE_EXPIRY_MINUTES,
} from "@/lib/constants";
import { hashPassword } from "@/lib/passwords";

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

// Generate an alphanumeric code
function generateCode(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = crypto.randomBytes(SHARE_CODE_LENGTH);
    let code = "";
    for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return code;
}

function isValidUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
    if (!dataUrl.startsWith("data:")) return null;
    const match = /^data:([^;]+);base64,(.*)$/i.exec(dataUrl);
    if (!match) return null;
    return { mimeType: match[1], data: match[2] };
}

function base64ByteLength(base64: string): number {
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export async function POST(request: NextRequest) {
    try {
        const body: CreateShareRequest | null = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return jsonResponse({ error: "Invalid request body" }, { status: 400 });
        }
        const {
            type,
            content,
            expiryMinutes = 60,
            password,
            burnAfterReading,
            language,
            originalName,
            mimeType
        } = body;

        if (typeof content !== "string" || typeof type !== "string") {
            return jsonResponse({ error: "Content and type required" }, { status: 400 });
        }

        const normalizedContent = type === "image" ? content : content.trim();
        const normalizedPassword = typeof password === "string" && password.trim()
            ? password.trim()
            : null;
        const normalizedBurn = Boolean(burnAfterReading);

        if (!normalizedContent || !type) {
            return jsonResponse({ error: "Content and type required" }, { status: 400 });
        }

        // Validate type
        const validTypes: ShareType[] = ['link', 'paste', 'image', 'note', 'code', 'json', 'csv'];
        if (!validTypes.includes(type)) {
            return jsonResponse({ error: "Invalid share type" }, { status: 400 });
        }

        // For links, validate URL
        if (type === 'link') {
            if (!isValidUrl(normalizedContent)) {
                return jsonResponse({ error: "Invalid URL" }, { status: 400 });
            }
        }

        // For JSON, validate
        if (type === 'json') {
            try {
                JSON.parse(normalizedContent);
            } catch {
                return jsonResponse({ error: "Invalid JSON" }, { status: 400 });
            }
        }

        // Check content size (max 1MB for text content)
        if (type !== 'image' && normalizedContent.length > MAX_SHARE_TEXT_SIZE) {
            return jsonResponse({ error: "Content too large (max 1MB)" }, { status: 400 });
        }

        let imageSize = 0;
        let imageMimeType = mimeType;
        if (type === "image") {
            const parsed = parseDataUrl(content);
            if (!parsed) {
                return jsonResponse({ error: "Invalid image data" }, { status: 400 });
            }
            if (!parsed.mimeType.startsWith("image/")) {
                return jsonResponse({ error: "Invalid image type" }, { status: 400 });
            }
            imageSize = base64ByteLength(parsed.data);
            if (imageSize > MAX_SHARE_IMAGE_BYTES) {
                return jsonResponse({ error: "Image too large (max 5MB)" }, { status: 400 });
            }
            imageMimeType = parsed.mimeType;
        }

        if (!r2Storage.isConfigured()) {
            return jsonResponse({ error: "Storage not configured" }, { status: 500 });
        }

        // Generate unique code
        let code = generateCode();
        let attempts = 0;
        while (await r2Storage.getShareMetadata(code) && attempts < 10) {
            code = generateCode();
            attempts++;
        }

        const parsedExpiry = Number.isFinite(Number(expiryMinutes))
            ? Number(expiryMinutes)
            : 60;
        const safeExpiryMinutes = Math.min(Math.max(parsedExpiry, 1), MAX_SHARE_EXPIRY_MINUTES);
        const expiresAt = new Date(Date.now() + safeExpiryMinutes * 60 * 1000);

        const metadata: ShareMetadata = {
            type,
            content: normalizedContent,
            originalName,
            mimeType: imageMimeType,
            size: imageSize || undefined,
            language,
            expiresAt: expiresAt.toISOString(),
            password: normalizedPassword ? hashPassword(normalizedPassword) : null,
            burnAfterReading: normalizedBurn,
            viewCount: 0,
            burned: false,
            createdAt: new Date().toISOString(),
        };

        await r2Storage.saveShareMetadata(code, metadata);

        const baseUrl = request.nextUrl.origin;
        const url = `${baseUrl}/s/${code}`;

        return jsonResponse({
            code,
            url,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error("Share creation error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to create share";
        return jsonResponse({ error: errorMessage }, { status: 500 });
    }
}
