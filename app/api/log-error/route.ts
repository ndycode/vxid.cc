import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Client error reporting endpoint
 * Receives errors from the frontend and logs them to the backend
 * for centralized monitoring and alerting.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));

        const {
            message,
            stack,
            digest,
            url,
            userAgent,
            timestamp,
        } = body;

        if (!message || typeof message !== "string") {
            return NextResponse.json({ error: "Missing error message" }, { status: 400 });
        }

        // Log the client error with full context
        logger.error("Client error reported", {
            message: message.slice(0, 500), // Truncate to prevent log bloat
            stack: typeof stack === "string" ? stack.slice(0, 2000) : undefined,
            digest: typeof digest === "string" ? digest : undefined,
            url: typeof url === "string" ? url.slice(0, 500) : undefined,
            userAgent: typeof userAgent === "string" ? userAgent.slice(0, 300) : undefined,
            timestamp: typeof timestamp === "string" ? timestamp : new Date().toISOString(),
            source: "client",
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.exception("Error logging client error", error);
        return NextResponse.json({ error: "Failed to log error" }, { status: 500 });
    }
}
