"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import {
    ArrowLeft,
    UploadSimple,
    DownloadSimple,
    File,
    CheckCircle,
    CaretDown,
    CloudArrowDown,
    Copy,
    FileArchive,
    Warning,
    Eye,
    EyeSlash,
    Link as LinkIcon,
    QrCode
} from "@phosphor-icons/react";

// Smooth easing - no bouncy springs
const transition = { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const };

type Tab = "send" | "receive";
type UploadStatus = "idle" | "uploading" | "done";
type DownloadStatus = "idle" | "loading" | "ready" | "downloading";

const EXPIRY = ["10m", "1h", "24h", "7d"];
const LIMITS = ["1", "5", "10", "∞"];

export default function SharePage() {
    const [tab, setTab] = useState<Tab>("send");

    // Upload
    const [file, setFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
    const [progress, setProgress] = useState(0);
    const [shareCode, setShareCode] = useState("");
    const [showOptions, setShowOptions] = useState(false);
    const [expiry, setExpiry] = useState(1);
    const [limit, setLimit] = useState(0);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Handle tab change - reset options
    const handleTabChange = (newTab: Tab) => {
        setTab(newTab);
        setShowOptions(false);
    };

    // Download
    const [code, setCode] = useState("");
    const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>("idle");
    const [error, setError] = useState("");

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setFile(e.target.files[0]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
    };

    const upload = () => {
        if (!file) return;
        setUploadStatus("uploading");
        setProgress(0);
        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    clearInterval(interval);
                    setUploadStatus("done");
                    setShareCode(Math.floor(100000 + Math.random() * 900000).toString());
                    return 100;
                }
                return p + Math.random() * 25;
            });
        }, 120);
    };

    const reset = () => {
        setFile(null);
        setUploadStatus("idle");
        setProgress(0);
        setShareCode("");
    };

    const checkCode = () => {
        if (code.length !== 6) return;
        setDownloadStatus("loading");
        setError("");
        setTimeout(() => {
            // No backend - always show not found
            setError("File not found or expired");
            setDownloadStatus("idle");
        }, 500);
    };

    const resetDownload = () => {
        setCode("");
        setDownloadStatus("idle");
        setError("");
    };

    return (
        <LayoutGroup>
            <main className="min-h-screen flex flex-col items-center justify-center px-6 py-6 relative">
                {/* Back button */}
                <Link href="/" className="absolute top-4 left-4">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>

                {/* Header - centered like page 1 */}
                <motion.div
                    layoutId="page-header"
                    className="text-center mb-6 max-w-sm w-full"
                    transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] as const }}
                >
                    <motion.h1
                        layoutId="page-title"
                        className="text-4xl font-bold tracking-tight"
                        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] as const }}
                    >
                        dead drop
                    </motion.h1>
                    <motion.p
                        layoutId="page-subtitle"
                        className="text-muted-foreground text-sm"
                        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] as const }}
                    >
                        files in, files out, no questions asked
                    </motion.p>
                </motion.div>

                {/* Content */}
                <motion.div
                    className="w-full max-w-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }}
                >

                    {/* Tabs */}
                    <div className="flex bg-muted/50 p-1 rounded-xl mb-4 gap-1">
                        {(["send", "receive"] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => handleTabChange(t)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg relative z-10 outline-none"
                            >
                                {tab === t && (
                                    <motion.div
                                        layoutId="tab-indicator"
                                        className="absolute inset-0 bg-background rounded-lg shadow-sm"
                                        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                                    />
                                )}
                                <span className={`relative z-10 flex items-center gap-1.5 transition-colors ${tab === t ? "text-foreground" : "text-muted-foreground"}`}>
                                    {t === "send" ? <UploadSimple className="w-4 h-4" /> : <DownloadSimple className="w-4 h-4" />}
                                    {t === "send" ? "Send" : "Receive"}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col">
                        <AnimatePresence mode="wait" initial={false}>
                            {tab === "send" ? (
                                <motion.div
                                    key="send"
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 8 }}
                                    transition={transition}
                                    className="bg-card border rounded-2xl p-4 flex flex-col"
                                >
                                    {uploadStatus === "done" ? (
                                        <div className="py-4 space-y-4">
                                            {/* Header row with check and QR */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="flex items-center gap-4"
                                            >
                                                <div className="flex-1 flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                                        <CheckCircle weight="fill" className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-semibold">Done</p>
                                                        <p className="text-muted-foreground text-xs">Share this code</p>
                                                    </div>
                                                </div>
                                                {/* Real QR Code */}
                                                <div className="shrink-0">
                                                    <QRCodeSVG
                                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share?code=${shareCode}`}
                                                        size={52}
                                                        level="L"
                                                        bgColor="transparent"
                                                        fgColor="#ffffff"
                                                    />
                                                </div>
                                            </motion.div>

                                            {/* Code display */}
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.1, duration: 0.3 }}
                                                className="bg-muted/50 p-3 rounded-xl text-center"
                                            >
                                                <p className="text-2xl font-mono font-bold tracking-[0.15em]">{shareCode}</p>
                                            </motion.div>

                                            {/* Action buttons */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2, duration: 0.3 }}
                                                className="flex gap-2"
                                            >
                                                <Button
                                                    variant="outline"
                                                    onClick={() => navigator.clipboard.writeText(shareCode)}
                                                    className="flex-1 gap-1.5 h-9"
                                                    size="sm"
                                                >
                                                    <Copy className="w-3.5 h-3.5" /> Code
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/share?code=${shareCode}`)}
                                                    className="flex-1 gap-1.5 h-9"
                                                    size="sm"
                                                >
                                                    <LinkIcon className="w-3.5 h-3.5" /> Link
                                                </Button>
                                                <Button onClick={reset} className="flex-1 h-9" size="sm">
                                                    New
                                                </Button>
                                            </motion.div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Dropzone */}
                                            <div
                                                onDragOver={e => e.preventDefault()}
                                                onDrop={handleDrop}
                                                className={`relative min-h-[140px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer transition-colors ${file ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                                            >
                                                <input type="file" onChange={handleFile} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                {file ? (
                                                    <div className="text-center space-y-1">
                                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                                                            <File weight="duotone" className="w-5 h-5 text-primary" />
                                                        </div>
                                                        <p className="font-medium text-sm truncate max-w-[180px]">{file.name}</p>
                                                        <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                                                    </div>
                                                ) : (
                                                    <div className="text-center space-y-1">
                                                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mx-auto">
                                                            <UploadSimple className="w-5 h-5 text-muted-foreground" />
                                                        </div>
                                                        <p className="text-sm font-medium">Drop file</p>
                                                        <p className="text-xs text-muted-foreground">or click to browse</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Options */}
                                            <div>
                                                <button
                                                    onClick={() => setShowOptions(!showOptions)}
                                                    className="w-full flex items-center justify-between text-sm text-muted-foreground py-2 transition-colors hover:text-foreground"
                                                >
                                                    Options
                                                    <motion.div animate={{ rotate: showOptions ? 180 : 0 }} transition={transition}>
                                                        <CaretDown className="w-4 h-4" />
                                                    </motion.div>
                                                </button>
                                                <AnimatePresence>
                                                    {showOptions && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={transition}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="pt-2 pb-1 space-y-3">
                                                                <div className="space-y-1.5">
                                                                    <p className="text-xs text-muted-foreground">Expires</p>
                                                                    <div className="grid grid-cols-4 gap-1">
                                                                        {EXPIRY.map((e, i) => (
                                                                            <motion.button
                                                                                key={e}
                                                                                onClick={() => setExpiry(i)}
                                                                                whileTap={{ scale: 0.95 }}
                                                                                transition={{ duration: 0.15 }}
                                                                                className={`text-xs py-1.5 rounded-md transition-all outline-none ${expiry === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                                                                            >
                                                                                {e}
                                                                            </motion.button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <p className="text-xs text-muted-foreground">Downloads</p>
                                                                    <div className="grid grid-cols-4 gap-1">
                                                                        {LIMITS.map((l, i) => (
                                                                            <motion.button
                                                                                key={l}
                                                                                onClick={() => setLimit(i)}
                                                                                whileTap={{ scale: 0.95 }}
                                                                                transition={{ duration: 0.15 }}
                                                                                className={`text-xs py-1.5 rounded-md transition-all outline-none ${limit === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                                                                            >
                                                                                {l}
                                                                            </motion.button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <p className="text-xs text-muted-foreground">Password (optional)</p>
                                                                    <div className="relative">
                                                                        <Input
                                                                            type={showPassword ? "text" : "password"}
                                                                            placeholder="Enter password"
                                                                            value={password}
                                                                            onChange={(e) => setPassword(e.target.value)}
                                                                            className="h-8 text-xs pr-8"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setShowPassword(!showPassword)}
                                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                                        >
                                                                            {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* Upload */}
                                            {uploadStatus === "uploading" ? (
                                                <div className="space-y-2 pt-2">
                                                    <Progress value={progress} className="h-1.5" />
                                                    <p className="text-xs text-center text-muted-foreground">Uploading...</p>
                                                </div>
                                            ) : (
                                                <motion.div layoutId="main-action" transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] as const }}>
                                                    <Button onClick={upload} disabled={!file} className="w-full" size="lg">
                                                        Upload
                                                    </Button>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="receive"
                                    initial={{ opacity: 0, x: 8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -8 }}
                                    transition={transition}
                                    className="bg-card border rounded-2xl p-4 flex flex-col"
                                >
                                    {downloadStatus === "ready" ? (
                                        <div className="py-8 text-center space-y-5">
                                            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                                                <FileArchive weight="duotone" className="w-7 h-7 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold">secret_file.zip</p>
                                                <p className="text-sm text-muted-foreground">25 MB • expires in 1h</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Button className="w-full gap-1.5" size="lg">
                                                    <CloudArrowDown className="w-5 h-5" /> Download
                                                </Button>
                                                <Button variant="ghost" onClick={resetDownload} className="w-full text-muted-foreground">
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-6 text-center space-y-5">
                                            <div>
                                                <p className="font-semibold text-lg">Get file</p>
                                                <p className="text-sm text-muted-foreground">Enter 6-digit code</p>
                                            </div>
                                            <div className="flex justify-center">
                                                <InputOTP
                                                    maxLength={6}
                                                    value={code}
                                                    onChange={(v) => {
                                                        setCode(v);
                                                        setError("");
                                                        if (v.length === 6) setTimeout(checkCode, 50);
                                                    }}
                                                >
                                                    <InputOTPGroup className="gap-1.5">
                                                        {[0, 1, 2, 3, 4, 5].map(i => (
                                                            <InputOTPSlot key={i} index={i} className="w-9 h-11 rounded-lg border-2 text-base" />
                                                        ))}
                                                    </InputOTPGroup>
                                                </InputOTP>
                                            </div>
                                            {error && (
                                                <p className="text-sm text-destructive flex items-center justify-center gap-1">
                                                    <Warning weight="bold" className="w-4 h-4" /> {error}
                                                </p>
                                            )}
                                            <Button
                                                onClick={checkCode}
                                                disabled={code.length !== 6 || downloadStatus === "loading"}
                                                className="w-full"
                                                size="lg"
                                            >
                                                {downloadStatus === "loading" ? "Checking..." : "Get File"}
                                            </Button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </main>
        </LayoutGroup>
    );
}
