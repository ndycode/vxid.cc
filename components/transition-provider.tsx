"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function TransitionProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [displayChildren, setDisplayChildren] = useState(children);
    const [transitionStage, setTransitionStage] = useState("enter");

    useEffect(() => {
        if (children !== displayChildren) {
            setTransitionStage("exit");
        }
    }, [children, displayChildren]);

    return (
        <div
            className={`min-h-screen transition-all duration-300 ease-out ${transitionStage === "exit"
                    ? "opacity-0 translate-y-4"
                    : "opacity-100 translate-y-0"
                }`}
            onTransitionEnd={() => {
                if (transitionStage === "exit") {
                    setDisplayChildren(children);
                    setTransitionStage("enter");
                }
            }}
        >
            {displayChildren}
        </div>
    );
}
