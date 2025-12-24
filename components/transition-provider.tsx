"use client";

import { ReactNode } from "react";
import { LayoutGroup } from "framer-motion";

export function TransitionProvider({ children }: { children: ReactNode }) {
    return (
        <LayoutGroup>
            {children}
        </LayoutGroup>
    );
}
