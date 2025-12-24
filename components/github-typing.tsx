"use client";

import { TypingAnimation } from "@/components/ui/typing-animation";

export function GitHubTyping() {
    return (
        <TypingAnimation
            loop
            typeSpeed={80}
            deleteSpeed={40}
            pauseDelay={3000}
            showCursor
            cursorStyle="line"
            className="text-xs"
        >
            github.com/ndycode
        </TypingAnimation>
    );
}
