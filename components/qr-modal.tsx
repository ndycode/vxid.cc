"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Link as LinkIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface QRModalProps {
    code: string;
    isOpen: boolean;
    onClose: () => void;
    onCopy: (text: string, label: string) => void;
}

export function QRModal({ code, isOpen, onClose, onCopy }: QRModalProps) {
    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/download?code=${code}`
        : '';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm mx-4 transform-gpu"
                    >
                        <div className="bg-card border rounded-2xl p-6 space-y-5 shadow-xl">
                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* QR Code */}
                            <div className="flex justify-center pt-2">
                                <div className="p-4 bg-white rounded-xl">
                                    <QRCodeSVG
                                        value={shareUrl}
                                        size={180}
                                        level="M"
                                        bgColor="white"
                                        fgColor="black"
                                    />
                                </div>
                            </div>

                            {/* Code */}
                            <div className="text-center">
                                <p className="text-3xl font-mono font-bold tracking-[0.2em]">{code}</p>
                                <p className="text-sm text-muted-foreground mt-1">scan or share code</p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => onCopy(code, "Code")}
                                    className="flex-1 gap-1.5"
                                >
                                    <Copy className="w-4 h-4" /> Code
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => onCopy(shareUrl, "Link")}
                                    className="flex-1 gap-1.5"
                                >
                                    <LinkIcon className="w-4 h-4" /> Link
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
