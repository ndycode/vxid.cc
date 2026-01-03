"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Warning, House, ArrowClockwise } from "@phosphor-icons/react";

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log to console for debugging - never expose to users
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
                    <div className="max-w-sm space-y-6">
                        <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto">
                            <Warning weight="duotone" className="w-8 h-8 text-destructive" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold">Something didn&apos;t load correctly</h2>
                            <p className="text-sm text-muted-foreground">
                                This may be a temporary issue. You can try again, or go back to the home page.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button onClick={this.handleReset} className="flex-1 gap-2">
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
                </div>
            );
        }

        return this.props.children;
    }
}

