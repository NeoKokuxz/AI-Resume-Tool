"use client";

import { Resume } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/utils";
import { getResumePDFSignedUrl } from "@/lib/db";
import { CheckCircle, Download, FileText, Star } from "lucide-react";

interface ResumeViewerProps {
  resume: Resume;
}

export function ResumeViewer({ resume }: ResumeViewerProps) {
  async function handleViewPDF() {
    if (!resume.pdfStoragePath) return;
    const url = await getResumePDFSignedUrl(resume.pdfStoragePath);
    if (url) window.open(url, "_blank");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Resume meta */}
      <div className="space-y-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-950 rounded-lg flex items-center justify-center">
              <CheckCircle size={18} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200">Resume Active</p>
              <p className="text-xs text-gray-500">
                {formatRelativeTime(resume.uploadedAt)}
              </p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>File</span>
              <span className="text-gray-300 font-medium truncate ml-2">
                {resume.fileName}
              </span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Words</span>
              <span className="text-gray-300 font-medium">
                {resume.content.split(/\s+/).length.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Skills found</span>
              <span className="text-gray-300 font-medium">
                {resume.skills.length}
              </span>
            </div>
          </div>
          {resume.pdfStoragePath && (
            <button
              onClick={handleViewPDF}
              className="mt-4 w-full flex items-center justify-center gap-2 text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 rounded-md py-2 transition-colors"
            >
              <Download size={12} />
              View original PDF
            </button>
          )}
        </div>

        {/* Skills */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className="text-yellow-400" />
            <h3 className="text-sm font-semibold text-gray-200">Detected Skills</h3>
          </div>
          {resume.skills.length === 0 ? (
            <p className="text-xs text-gray-600">No skills detected</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {resume.skills.map((skill) => (
                <Badge key={skill} variant="purple">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resume content */}
      <div className="lg:col-span-2 card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-800">
          <FileText size={15} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-300">
            {resume.fileName}
          </span>
        </div>
        <pre className="p-5 text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed overflow-auto max-h-[calc(100vh-280px)]">
          {resume.content}
        </pre>
      </div>
    </div>
  );
}
