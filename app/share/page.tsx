"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SharePage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const code = searchParams.get("code");
        if (code) {
            router.replace(`/download?code=${encodeURIComponent(code)}`);
            return;
        }
        router.replace("/");
    }, [router, searchParams]);

    return null;
}
