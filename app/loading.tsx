import { Spinner } from "@phosphor-icons/react/dist/ssr";

export default function Loading() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
            <div className="flex flex-col items-center gap-4">
                <Spinner weight="bold" className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
        </main>
    );
}
