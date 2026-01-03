import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PageShell } from "@/components/ui/page-shell";

export const dynamic = "force-dynamic";
import ShareClient from "./share-client";

export default function SharePage() {
    return (
        <Suspense
            fallback={
                <PageShell maxWidth="sm">
                    <LoadingSpinner size="md" label="Redirecting..." />
                </PageShell>
            }
        >
            <ShareClient />
        </Suspense>
    );
}
