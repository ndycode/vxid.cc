import { Suspense } from "react";
import DownloadLoading from "./loading";

export const dynamic = "force-dynamic";
import DownloadClient from "./download-client";

export default function DownloadPage() {
    return (
        <Suspense fallback={<DownloadLoading />}>
            <DownloadClient />
        </Suspense>
    );
}
