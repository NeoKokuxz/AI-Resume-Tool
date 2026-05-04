"use client";

import { useEffect, useState } from "react";
import { Application } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { getResumePDFSignedUrl } from "@/lib/db";
import { Briefcase, Check, Copy, ExternalLink, FileText, Loader2 } from "lucide-react";

interface ResumeModalProps {
  application: Application | null;
  resumeContent: { resume: string; coverLetter: string } | null;
  loading: boolean;
  originalPdfStoragePath?: string;
  tailoredPdfStoragePath?: string;
  onClose: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
    >
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function PDFPanel({ storagePath, textContent, label }: { storagePath?: string; textContent?: string; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (storagePath) {
      getResumePDFSignedUrl(storagePath).then(setUrl);
    } else if (textContent) {
      fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: textContent }),
      })
        .then((r) => r.blob())
        .then((blob) => setBlobUrl(URL.createObjectURL(blob)));
    }
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storagePath, textContent]);

  const iframeUrl = url ?? blobUrl;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-300">{label}</span>
        </div>
        {iframeUrl && (
          <a
            href={iframeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ExternalLink size={11} />
            Open
          </a>
        )}
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-gray-800 bg-gray-950">
        {iframeUrl ? (
          <iframe src={iframeUrl} className="w-full h-full" title={label} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" />
            Loading PDF…
          </div>
        )}
      </div>
    </div>
  );
}

export function ResumeModal({
  application,
  resumeContent,
  loading,
  originalPdfStoragePath,
  tailoredPdfStoragePath,
  onClose,
}: ResumeModalProps) {
  const hasOriginal = !!originalPdfStoragePath;
  const splitView = hasOriginal;
  const modalSize = resumeContent ? "2xl" : "xl";

  return (
    <Modal
      isOpen={!!application}
      onClose={onClose}
      title={`Tailored Resume — ${application?.job.title} at ${application?.job.company}`}
      size={modalSize}
    >
      {application && (
        <div className={splitView ? "flex gap-6 h-[75vh]" : "space-y-4"}>
          {/* Left: Original PDF */}
          {hasOriginal && (
            <div className="w-1/2 min-h-0">
              <PDFPanel storagePath={originalPdfStoragePath} label="Original PDF" />
            </div>
          )}

          {/* Right: Tailored PDF or text + cover letter */}
          <div className={`${splitView ? "w-1/2" : "w-full"} flex flex-col gap-4 min-h-0 overflow-y-auto`}>
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-3 text-gray-500">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Loading resume...</span>
              </div>
            ) : (
              <>
                {/* Tailored resume — PDF from storage or generated on-the-fly from text */}
                {resumeContent?.resume && (
                  <div className="flex-1 min-h-0" style={{ minHeight: "55%" }}>
                    <PDFPanel
                      storagePath={tailoredPdfStoragePath}
                      textContent={!tailoredPdfStoragePath ? resumeContent.resume : undefined}
                      label="Tailored Resume"
                    />
                  </div>
                )}

                {/* Cover letter — always text */}
                {resumeContent?.coverLetter && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Briefcase size={14} className="text-blue-400" />
                        <h3 className="text-sm font-semibold text-gray-300">Cover Letter</h3>
                      </div>
                      <CopyButton text={resumeContent.coverLetter} />
                    </div>
                    <pre className="bg-gray-800 rounded-xl p-4 text-xs text-gray-300 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto leading-relaxed">
                      {resumeContent.coverLetter}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
