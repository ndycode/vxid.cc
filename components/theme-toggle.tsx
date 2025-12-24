"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "@phosphor-icons/react";

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Check localStorage first, then system preference
        const stored = localStorage.getItem("theme");
        if (stored === "dark") {
            setIsDark(true);
            document.documentElement.classList.add("dark");
        } else if (stored === "light") {
            setIsDark(false);
            document.documentElement.classList.remove("dark");
        } else {
            // No stored preference, use system
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            setIsDark(prefersDark);
            document.documentElement.classList.toggle("dark", prefersDark);
        }
    }, []);

    const toggle = () => {
        const newDark = !isDark;
        setIsDark(newDark);
        document.documentElement.classList.toggle("dark", newDark);
        localStorage.setItem("theme", newDark ? "dark" : "light");
    };

    if (!mounted) return <div className="w-9 h-9" />;

    return (
        <motion.button
            onClick={toggle}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted transition-colors"
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.15 }}
            aria-label="Toggle theme"
        >
            <motion.div
                initial={false}
                animate={{ rotate: isDark ? 180 : 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
                {isDark ? (
                    <Moon weight="fill" className="w-4 h-4" />
                ) : (
                    <Sun weight="fill" className="w-4 h-4" />
                )}
            </motion.div>
        </motion.button>
    );
}
