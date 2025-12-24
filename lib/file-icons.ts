import {
    File,
    FileImage,
    FilePdf,
    FileVideo,
    FileAudio,
    FileZip,
    FileCode,
    FileText,
    FileDoc,
    FileXls,
    FilePpt,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

type FileIconInfo = {
    icon: Icon;
    color: string;
};

const extensionMap: Record<string, FileIconInfo> = {
    // Images
    jpg: { icon: FileImage, color: "text-emerald-500" },
    jpeg: { icon: FileImage, color: "text-emerald-500" },
    png: { icon: FileImage, color: "text-emerald-500" },
    gif: { icon: FileImage, color: "text-emerald-500" },
    webp: { icon: FileImage, color: "text-emerald-500" },
    svg: { icon: FileImage, color: "text-emerald-500" },
    ico: { icon: FileImage, color: "text-emerald-500" },

    // PDF
    pdf: { icon: FilePdf, color: "text-red-500" },

    // Video
    mp4: { icon: FileVideo, color: "text-purple-500" },
    mov: { icon: FileVideo, color: "text-purple-500" },
    avi: { icon: FileVideo, color: "text-purple-500" },
    mkv: { icon: FileVideo, color: "text-purple-500" },
    webm: { icon: FileVideo, color: "text-purple-500" },

    // Audio
    mp3: { icon: FileAudio, color: "text-orange-500" },
    wav: { icon: FileAudio, color: "text-orange-500" },
    flac: { icon: FileAudio, color: "text-orange-500" },
    ogg: { icon: FileAudio, color: "text-orange-500" },
    m4a: { icon: FileAudio, color: "text-orange-500" },

    // Archives
    zip: { icon: FileZip, color: "text-yellow-500" },
    rar: { icon: FileZip, color: "text-yellow-500" },
    "7z": { icon: FileZip, color: "text-yellow-500" },
    tar: { icon: FileZip, color: "text-yellow-500" },
    gz: { icon: FileZip, color: "text-yellow-500" },

    // Code
    js: { icon: FileCode, color: "text-yellow-400" },
    ts: { icon: FileCode, color: "text-blue-500" },
    jsx: { icon: FileCode, color: "text-cyan-500" },
    tsx: { icon: FileCode, color: "text-cyan-500" },
    py: { icon: FileCode, color: "text-green-500" },
    java: { icon: FileCode, color: "text-red-500" },
    cpp: { icon: FileCode, color: "text-blue-600" },
    c: { icon: FileCode, color: "text-blue-600" },
    html: { icon: FileCode, color: "text-orange-500" },
    css: { icon: FileCode, color: "text-blue-400" },
    json: { icon: FileCode, color: "text-yellow-500" },

    // Documents
    doc: { icon: FileDoc, color: "text-blue-600" },
    docx: { icon: FileDoc, color: "text-blue-600" },
    txt: { icon: FileText, color: "text-gray-500" },
    md: { icon: FileText, color: "text-gray-500" },
    rtf: { icon: FileText, color: "text-gray-500" },

    // Spreadsheets
    xls: { icon: FileXls, color: "text-green-600" },
    xlsx: { icon: FileXls, color: "text-green-600" },
    csv: { icon: FileXls, color: "text-green-600" },

    // Presentations
    ppt: { icon: FilePpt, color: "text-orange-600" },
    pptx: { icon: FilePpt, color: "text-orange-600" },
};

export function getFileIcon(filename: string): FileIconInfo {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return extensionMap[ext] || { icon: File, color: "text-primary" };
}

export function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
}
