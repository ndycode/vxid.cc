"use client";

import { useRouter } from "next/navigation";
import { motion, LayoutGroup } from "framer-motion";
import { Button } from "@/components/ui/button";

const transition = { duration: 0.5, ease: [0.32, 0.72, 0, 1] as const };

export default function HomePage() {
    const router = useRouter();

    const handleEnter = () => {
        router.push("/share");
    };

    return (
        <LayoutGroup>
            <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative">
                <div className="w-full max-w-xs md:max-w-sm text-center space-y-8">

                    {/* Brand - will morph to header */}
                    <motion.div
                        layoutId="page-header"
                        className="space-y-2"
                        transition={transition}
                    >
                        <motion.h1
                            layoutId="page-title"
                            className="text-4xl font-bold tracking-tight"
                            transition={transition}
                        >
                            vxid.cc
                        </motion.h1>
                        <motion.p
                            layoutId="page-subtitle"
                            className="text-muted-foreground text-sm"
                            transition={transition}
                        >
                            all tools u need :&gt;
                        </motion.p>
                    </motion.div>

                    {/* Enter Button - will morph to Upload button */}
                    <motion.div
                        layoutId="main-action"
                        transition={transition}
                    >
                        <Button
                            size="lg"
                            className="w-full text-base py-6 rounded-xl"
                            onClick={handleEnter}
                        >
                            <motion.span layoutId="action-text" transition={transition}>
                                enter
                            </motion.span>
                        </Button>
                    </motion.div>

                    {/* Tagline */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                        className="text-xs text-muted-foreground/50"
                    >
                        the tools you keep forgetting to bookmark
                    </motion.p>
                </div>
            </main>
        </LayoutGroup>
    );
}