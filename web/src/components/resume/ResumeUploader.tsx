"use client";

import { useRef, useState } from "react";
import { Upload, Code } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResumeUploaderProps {
  onFile: (file: File) => void;
  onPasteMode: () => void;
}

export function ResumeUploader({ onFile, onPasteMode }: ResumeUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
          isDragging
            ? "border-indigo-500 bg-indigo-950/20"
            : "border-gray-700 hover:border-gray-600 hover:bg-gray-900/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.doc,.docx"
          onChange={handleFileInput}
          className="hidden"
        />
        <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Upload size={24} className="text-gray-400" />
        </div>
        <p className="text-base font-medium text-gray-300 mb-1">
          Drop your resume here
        </p>
        <p className="text-sm text-gray-500">
          Supports .pdf, .txt, .md, .doc, .docx files
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-800" />
        <span className="text-xs text-gray-600">or</span>
        <div className="flex-1 h-px bg-gray-800" />
      </div>

      <button
        onClick={onPasteMode}
        className="w-full card p-5 hover:border-indigo-700 hover:bg-gray-900 transition-all flex items-center gap-4 text-left"
      >
        <div className="w-10 h-10 bg-indigo-950 rounded-lg flex items-center justify-center">
          <Code size={18} className="text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-200">Paste Resume Text</p>
          <p className="text-xs text-gray-500">Type or paste your resume directly</p>
        </div>
      </button>
    </div>
  );
}
