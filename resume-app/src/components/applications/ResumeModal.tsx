"use client";

import { Application } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { FileText, Briefcase, Loader2 } from "lucide-react";

interface ResumeModalProps {
  application: Application | null;
  resumeContent: { resume: string; coverLetter: string } | null;
  loading: boolean;
  onClose: () => void;
}

export function ResumeModal({ application, resumeContent, loading, onClose }: ResumeModalProps) {
  return (
    <Modal
      isOpen={!!application}
      onClose={onClose}
      title={`Tailored Resume — ${application?.job.title} at ${application?.job.company}`}
      size="xl"
    >
      {application && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-gray-500">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading resume...</span>
            </div>
          ) : (
            <>
              {resumeContent?.resume && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} className="text-green-400" />
                    <h3 className="text-sm font-semibold text-gray-300">Tailored Resume</h3>
                  </div>
                  <pre className="bg-gray-800 rounded-xl p-4 text-xs text-gray-300 whitespace-pre-wrap font-mono max-h-72 overflow-y-auto leading-relaxed">
                    {resumeContent.resume}
                  </pre>
                </div>
              )}
              {resumeContent?.coverLetter && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase size={14} className="text-blue-400" />
                    <h3 className="text-sm font-semibold text-gray-300">Cover Letter</h3>
                  </div>
                  <pre className="bg-gray-800 rounded-xl p-4 text-xs text-gray-300 whitespace-pre-wrap font-mono max-h-52 overflow-y-auto leading-relaxed">
                    {resumeContent.coverLetter}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
