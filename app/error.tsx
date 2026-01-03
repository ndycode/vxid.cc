"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Warning, House, ArrowClockwise } from "@phosphor-icons/react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log to console for development
        console.error("Global error:", error);

        // Report to backend for monitoring
        fetch("/api/log-error", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: error.message,
                stack: error.stack,
                digest: error.digest,
                url: typeof window !== "undefined" ? window.location.href : undefined,
                userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
                timestamp: new Date().toISOString(),
            }),
        }).catch(() => {
            // Silently fail - don't create error loops
        });
    }, [error]);

    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="max-w-sm space-y-6">
                <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto">
                    <Warning weight="duotone" className="w-8 h-8 text-destructive" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-xl font-semibold">Something didn&apos;t load correctly</h1>
                    <p className="text-sm text-muted-foreground">
                        This may be a temporary issue. You can try again, or go back to the home page.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={reset} className="flex-1 gap-2">
                        <ArrowClockwise weight="bold" className="w-4 h-4" />
                        Try again
                    </Button>
                    <Link href="/" className="flex-1">
                        <Button variant="outline" className="w-full gap-2">
                            <House weight="bold" className="w-4 h-4" />
                            Go home
                        </Button>
                    </Link>
                </div>

                <p className="text-xs text-muted-foreground/60">
                    If this keeps happening, try refreshing the page.
                </p>
            </div>
        </main>
    );
}
