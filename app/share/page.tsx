"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { QRModal } from "@/components/qr-modal";
import { getFileIcon } from "@/lib/file-icons";
import confetti from "canvas-confetti";
import {
    ArrowLeft,
    UploadSimple,
    DownloadSimple,
    File as FileIcon,
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

// Smooth easing - optimized for 60fps on mobile
const transition = { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const };
const fastTransition = { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as const };
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

type Tab = "send" | "receive";
type UploadStatus = "idle" | "uploading" | "done";
type DownloadStatus = "idle" | "loading" | "ready" | "downloading";

const EXPIRY = ["10m", "1h", "24h", "7d"];
const EXPIRY_MINUTES = [10, 60, 1440, 10080];
const LIMITS = ["1", "5", "10", "∞"];
const LIMITS_VALUES = [1, 5, 10, -1];

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
    const [uploadError, setUploadError] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);
    const [copyMessage, setCopyMessage] = useState("");
    const [showQRModal, setShowQRModal] = useState(false);

    // Handle tab change - reset options
    const handleTabChange = (newTab: Tab) => {
        setTab(newTab);
        setShowOptions(false);
    };

    // Download
    const [code, setCode] = useState("");
    const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>("idle");
    const [error, setError] = useState("");
    const [fileInfo, setFileInfo] = useState<{
        name: string;
        size: number;
        expiresAt: string;
        requiresPassword: boolean;
        downloadsRemaining: number | string;
    } | null>(null);
    const [downloadPassword, setDownloadPassword] = useState("");
    const [showDownloadPassword, setShowDownloadPassword] = useState(false);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    const formatExpiry = (expiresAt: string) => {
        const now = new Date();
        const exp = new Date(expiresAt);
        const diff = exp.getTime() - now.getTime();
        if (diff < 0) return "expired";
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 24) return `${Math.floor(hours / 24)}d`;
        if (hours > 0) return `${hours}h`;
        return `${minutes}m`;
    };

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopyMessage(`${label} copied!`);
            setTimeout(() => setCopyMessage(""), 2000);
        } catch {
            setCopyMessage("Failed to copy");
            setTimeout(() => setCopyMessage(""), 2000);
        }
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setFile(e.target.files[0]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
    };

    const upload = async () => {
        if (!file) return;

        setUploadStatus("uploading");
        setProgress(0);
        setUploadError("");

        const formData = new FormData();
        formData.append("files", file);
        formData.append("expiryMinutes", EXPIRY_MINUTES[expiry].toString());
        formData.append("maxDownloads", LIMITS_VALUES[limit].toString());
        if (password) formData.append("password", password);

        // Use XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                setProgress(percent);
            }
        });

        xhr.addEventListener("load", async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    setShareCode(data.code);
                    setUploadStatus("done");
                    // Fire confetti!
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#ec4899', '#f472b6', '#f9a8d4'],
                    });
                } catch {
                    setUploadError("Invalid response from server");
                    setUploadStatus("idle");
                }
            } else {
                try {
                    const data = JSON.parse(xhr.responseText);
                    setUploadError(data.error || "Upload failed");
                } catch {
                    setUploadError("Upload failed");
                }
                setUploadStatus("idle");
            }
        });

        xhr.addEventListener("error", () => {
            setUploadError("Network error - check your connection");
            setUploadStatus("idle");
        });

        xhr.open("POST", "/api/upload");
        xhr.send(formData);
    };

    const reset = () => {
        setFile(null);
        setUploadStatus("idle");
        setProgress(0);
        setShareCode("");
        setPassword("");
        setUploadError("");
        setCopyMessage("");
    };

    const checkCode = async () => {
        if (code.length !== 6) return;
        setDownloadStatus("loading");
        setError("");
        setFileInfo(null);


        try {
            const res = await fetch(`/api/download/${code}`);
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "File not found");
                setDownloadStatus("idle");
                return;
            }

            setFileInfo(data);
            setDownloadStatus("ready");
        } catch {
            setError("Network error - check your connection");
            setDownloadStatus("idle");
        }
    };

    const downloadFile = async () => {
        if (!fileInfo) return;
        setDownloadStatus("downloading");

        try {
            const passwordParam = fileInfo.requiresPassword ? `&password=${encodeURIComponent(downloadPassword)}` : "";
            const res = await fetch(`/api/download/${code}?download=true${passwordParam}`);

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Download failed");
                setDownloadStatus("ready");
                return;
            }

            // Trigger download
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileInfo.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            const { toast } = await import("sonner");
            toast.success("Download started!");
            resetDownload();
        } catch {
            setError("Download failed");
            setDownloadStatus("ready");
        }
    };

    const resetDownload = () => {
        setCode("");
        setDownloadStatus("idle");
        setError("");
        setFileInfo(null);
        setDownloadPassword("");
    };

    return (
        <LayoutGroup>
            <main className="min-h-screen flex flex-col items-center justify-center px-6 py-6 relative transform-gpu">
                {/* Back button */}
                <Link href="/" className="absolute top-4 left-4">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>

                {/* Header - centered like page 1 */}
                <motion.div
                    layoutId="page-header"
                    className="text-center mb-6 max-w-sm w-full transform-gpu"
                    transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] as const }}
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
                        drop it, share it, forget it
                    </motion.p>
                </motion.div>

                {/* Content */}
                <motion.div
                    className="w-full max-w-sm transform-gpu"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const }}
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
                                                        <p className="text-muted-foreground text-xs">
                                                            {copyMessage || "Share this code"}
                                                        </p>
                                                    </div>
                                                </div>
                                                {/* Real QR Code - Clickable */}
                                                <button
                                                    onClick={() => setShowQRModal(true)}
                                                    className="shrink-0 text-foreground hover:scale-105 transition-transform"
                                                >
                                                    <QRCodeSVG
                                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share?code=${shareCode}`}
                                                        size={52}
                                                        level="L"
                                                        bgColor="transparent"
                                                        fgColor="currentColor"
                                                    />
                                                </button>
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
                                                    onClick={() => copyToClipboard(shareCode, "Code")}
                                                    className="flex-1 gap-1.5 h-9"
                                                    size="sm"
                                                >
                                                    <Copy className="w-3.5 h-3.5" /> Code
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => copyToClipboard(`${window.location.origin}/share?code=${shareCode}`, "Link")}
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
                                                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                                                onDragLeave={() => setIsDragOver(false)}
                                                onDrop={handleDrop}
                                                className={`relative min-h-[140px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer transition-colors ${file ? "border-primary bg-primary/5" : isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                                            >
                                                <input type="file" onChange={handleFile} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                {file ? (() => {
                                                    const { icon: Icon, color } = getFileIcon(file.name);
                                                    return (
                                                        <div className="text-center space-y-1">
                                                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                                                                <Icon weight="duotone" className={`w-5 h-5 ${color}`} />
                                                            </div>
                                                            <p className="font-medium text-sm truncate max-w-[180px]">{file.name}</p>
                                                            <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                                                        </div>
                                                    );
                                                })() : (
                                                    <div className="text-center space-y-1">
                                                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mx-auto">
                                                            <UploadSimple className="w-5 h-5 text-muted-foreground" />
                                                        </div>
                                                        <p className="text-sm font-medium">Drop file</p>
                                                        <p className="text-xs text-muted-foreground">1 GB max</p>
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
                                                <div className="space-y-2">
                                                    {uploadError && (
                                                        <p className="text-sm text-destructive flex items-center justify-center gap-1">
                                                            <Warning weight="bold" className="w-4 h-4" /> {uploadError}
                                                        </p>
                                                    )}
                                                    <motion.div layoutId="main-action" transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] as const }}>
                                                        <Button onClick={upload} disabled={!file} className="w-full" size="lg">
                                                            Upload
                                                        </Button>
                                                    </motion.div>
                                                </div>
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
                                    {downloadStatus === "ready" || downloadStatus === "downloading" ? (
                                        <div className="py-6 text-center space-y-4">
                                            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                                                <FileArchive weight="duotone" className="w-7 h-7 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold truncate max-w-[250px] mx-auto">{fileInfo?.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {fileInfo ? formatSize(fileInfo.size) : ''} • expires in {fileInfo ? formatExpiry(fileInfo.expiresAt) : ''}
                                                </p>
                                                {fileInfo?.downloadsRemaining !== 'unlimited' && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {fileInfo?.downloadsRemaining} download{fileInfo?.downloadsRemaining !== 1 ? 's' : ''} remaining
                                                    </p>
                                                )}
                                            </div>
                                            {fileInfo?.requiresPassword && (
                                                <div className="space-y-1.5 text-left">
                                                    <p className="text-xs text-muted-foreground">Password required</p>
                                                    <div className="relative">
                                                        <Input
                                                            type={showDownloadPassword ? "text" : "password"}
                                                            placeholder="Enter password"
                                                            value={downloadPassword}
                                                            onChange={(e) => setDownloadPassword(e.target.value)}
                                                            className="h-9 text-sm pr-8"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowDownloadPassword(!showDownloadPassword)}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                        >
                                                            {showDownloadPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {error && (
                                                <p className="text-sm text-destructive flex items-center justify-center gap-1">
                                                    <Warning weight="bold" className="w-4 h-4" /> {error}
                                                </p>
                                            )}
                                            <div className="space-y-2">
                                                <Button
                                                    onClick={downloadFile}
                                                    disabled={downloadStatus === "downloading" || (fileInfo?.requiresPassword && !downloadPassword)}
                                                    className="w-full gap-1.5"
                                                    size="lg"
                                                >
                                                    <CloudArrowDown className="w-5 h-5" />
                                                    {downloadStatus === "downloading" ? "Downloading..." : "Download"}
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

                {/* QR Modal */}
                <QRModal
                    code={shareCode}
                    isOpen={showQRModal}
                    onClose={() => setShowQRModal(false)}
                    onCopy={copyToClipboard}
                />
            </main>
        </LayoutGroup>
    );
}
