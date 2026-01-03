"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
    children: React.ReactNode;
    /** Max width variant: 'sm' (384px) | 'md' (512px) | 'lg' (640px) | 'xl' (768px) | 'full' */
    maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
    /** Center content vertically (default: true) */
    centered?: boolean;
    /** Additional className for the main element */
    className?: string;
    /** Additional className for the inner container */
    innerClassName?: string;
}

const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-full",
} as const;

/**
 * PageShell provides a consistent page layout wrapper for all page content.
 * It handles viewport height, centering, padding, and max-width constraints.
 *
 * @example
 * ```tsx
 * <PageShell maxWidth="sm">
 *   <Card>...</Card>
 * </PageShell>
 * ```
 */
export function PageShell({
    children,
    maxWidth = "sm",
    centered = true,
    className,
    innerClassName,
}: PageShellProps) {
    return (
        <main
            className={cn(
                "min-h-screen flex flex-col px-4 py-8",
                centered && "items-center justify-center",
                className
            )}
        >
            <div className={cn("relative z-10 w-full", maxWidthClasses[maxWidth], innerClassName)}>
                {children}
            </div>
        </main>
    );
}
