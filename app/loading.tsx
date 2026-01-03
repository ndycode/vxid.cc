import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PageShell } from "@/components/ui/page-shell";

export default function Loading() {
    return (
        <PageShell maxWidth="sm">
            <LoadingSpinner size="lg" label="Loading..." />
        </PageShell>
    );
}
