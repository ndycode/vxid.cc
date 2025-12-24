"use client";

import { useState, useCallback } from "react";
import confetti from "canvas-confetti";

const EXPIRY_MINUTES = [10, 60, 1440, 10080];
const LIMITS_VALUES = [1, 5, 10, -1];

interface UploadOptions {
    expiry: number;
    limit: number;
    password: string;
}

interface UploadState {
    file: File | null;
    status: "idle" | "uploading" | "done";
    progress: number;
    shareCode: string;
    error: string;
}

export function useUpload() {
    const [state, setState] = useState<UploadState>({
        file: null,
        status: "idle",
        progress: 0,
        shareCode: "",
        error: "",
    });

    const setFile = useCallback((file: File | null) => {
        setState(prev => ({ ...prev, file, error: "" }));
    }, []);

    const upload = useCallback(async (options: UploadOptions) => {
        if (!state.file) return;

        setState(prev => ({ ...prev, status: "uploading", progress: 0, error: "" }));

        const formData = new FormData();
        formData.append("files", state.file);
        formData.append("expiryMinutes", EXPIRY_MINUTES[options.expiry].toString());
        formData.append("maxDownloads", LIMITS_VALUES[options.limit].toString());
        if (options.password) formData.append("password", options.password);

        return new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener("progress", (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    setState(prev => ({ ...prev, progress: percent }));
                }
            });

            xhr.addEventListener("load", async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        setState(prev => ({
                            ...prev,
                            shareCode: data.code,
                            status: "done",
                        }));

                        // Fire confetti!
                        confetti({
                            particleCount: 100,
                            spread: 70,
                            origin: { y: 0.6 },
                            colors: ['#ec4899', '#f472b6', '#f9a8d4'],
                        });

                        const { toast } = await import("sonner");
                        toast.success("File uploaded!");
                        resolve(data.code);
                    } catch {
                        setState(prev => ({
                            ...prev,
                            error: "Invalid response from server",
                            status: "idle",
                        }));
                        reject(new Error("Invalid response"));
                    }
                } else {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        setState(prev => ({
                            ...prev,
                            error: data.error || "Upload failed",
                            status: "idle",
                        }));
                        reject(new Error(data.error || "Upload failed"));
                    } catch {
                        setState(prev => ({
                            ...prev,
                            error: "Upload failed",
                            status: "idle",
                        }));
                        reject(new Error("Upload failed"));
                    }
                }
            });

            xhr.addEventListener("error", () => {
                setState(prev => ({
                    ...prev,
                    error: "Network error - check your connection",
                    status: "idle",
                }));
                reject(new Error("Network error"));
            });

            xhr.open("POST", "/api/upload");
            xhr.send(formData);
        });
    }, [state.file]);

    const reset = useCallback(() => {
        setState({
            file: null,
            status: "idle",
            progress: 0,
            shareCode: "",
            error: "",
        });
    }, []);

    return {
        ...state,
        setFile,
        upload,
        reset,
    };
}
