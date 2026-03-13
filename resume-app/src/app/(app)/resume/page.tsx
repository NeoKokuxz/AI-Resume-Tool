"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { generateId } from "@/lib/utils";
import { saveResume, deleteResume } from "@/lib/db";
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

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || "";
      const resume: Resume = {
        id: generateId(),
        fileName: file.name,
        content,
        skills: extractSkills(content),
        uploadedAt: new Date().toISOString(),
      };
      setBaseResume(resume);
      saveResume(resume);
    };
    reader.readAsText(file);
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
