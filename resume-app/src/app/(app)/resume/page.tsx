"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { generateId } from "@/lib/utils";
import { saveResume, deleteResume, uploadResumePDF, updateUserProfile } from "@/lib/db";
import { Resume } from "@/types";
import { Edit3, Trash2 } from "lucide-react";
import { extractSkills } from "@/lib/resume-utils";
import { ResumeUploader } from "@/components/resume/ResumeUploader";
import { ResumeEditor } from "@/components/resume/ResumeEditor";
import { ResumeViewer } from "@/components/resume/ResumeViewer";

export default function ResumePage() {
  const { baseResume, setBaseResume } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  async function handleFile(file: File) {
    let content = "";

    const resumeId = generateId();
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    let pdfStoragePath: string | undefined;

    if (isPDF) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      const data = await res.json();
      content = data.text ?? "";
      pdfStoragePath = await uploadResumePDF(file, resumeId) ?? undefined;
    } else {
      content = await file.text();
    }

    const resume: Resume = {
      id: resumeId,
      fileName: file.name,
      content,
      skills: extractSkills(content),
      uploadedAt: new Date().toISOString(),
      pdfStoragePath,
    };
    setBaseResume(resume);
    saveResume(resume);
    updateUserProfile({ skills: resume.skills });
  }

  function handlePasteMode() {
    setIsEditing(true);
    setEditContent(baseResume?.content || "");
  }

  function handleSaveEdit() {
    if (!editContent.trim()) return;
    const resume: Resume = {
      id: baseResume?.id || generateId(),
      fileName: baseResume?.fileName || "My Resume.txt",
      content: editContent,
      skills: extractSkills(editContent),
      uploadedAt: new Date().toISOString(),
    };
    setBaseResume(resume);
    saveResume(resume);
    updateUserProfile({ skills: resume.skills });
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <ResumeEditor
        editContent={editContent}
        onChange={setEditContent}
        onSave={handleSaveEdit}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Resume</h1>
          <p className="text-sm text-gray-400 mt-1">
            Your base resume used for ATS scoring and AI optimization
          </p>
        </div>
        {baseResume && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Edit3 size={14} />}
              onClick={handlePasteMode}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={() => { setBaseResume(null); deleteResume(); }}
            >
              Remove
            </Button>
          </div>
        )}
      </div>

      {!baseResume ? (
        <ResumeUploader onFile={handleFile} onPasteMode={handlePasteMode} />
      ) : (
        <ResumeViewer resume={baseResume} />
      )}
    </div>
  );
}
