"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Warning } from "@phosphor-icons/react";

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center space-y-4">
                    <div className="w-14 h-14 bg-destructive/10 rounded-xl flex items-center justify-center">
                        <Warning weight="duotone" className="w-7 h-7 text-destructive" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Something went wrong</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {this.state.error?.message || "An unexpected error occurred"}
                        </p>
                    </div>
                    <Button
                        onClick={() => {
                            this.setState({ hasError: false, error: null });
                            window.location.reload();
                        }}
                    >
                        Try again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
