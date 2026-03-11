"use client";

import { useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { generateId, formatRelativeTime } from "@/lib/utils";
import { Resume } from "@/types";
import {
  Upload,
  FileText,
  CheckCircle,
  Edit3,
  Trash2,
  Star,
  Code,
} from "lucide-react";
import { cn } from "@/lib/utils";

function extractSkills(content: string): string[] {
  const skillKeywords = [
    "react", "typescript", "javascript", "python", "node.js", "next.js",
    "vue", "angular", "sql", "postgresql", "mongodb", "redis", "docker",
    "kubernetes", "aws", "gcp", "azure", "git", "tailwind", "graphql",
    "java", "golang", "rust", "django", "fastapi", "flask", "tensorflow",
    "pytorch", "machine learning", "ai", "llm", "ci/cd", "agile", "scrum",
  ];
  const lower = content.toLowerCase();
  return skillKeywords.filter((s) => lower.includes(s)).map((s) =>
    s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );
}

export default function ResumePage() {
  const { baseResume, setBaseResume } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
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
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Resume</h1>
            <p className="text-sm text-gray-400 mt-1">Paste or type your resume content below</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editContent.trim()}>
              Save Resume
            </Button>
          </div>
        </div>
        <div className="card overflow-hidden">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-[calc(100vh-220px)] bg-transparent text-gray-200 text-sm font-mono p-5 focus:outline-none resize-none"
            placeholder="Paste your resume content here..."
            autoFocus
          />
        </div>
      </div>
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
              onClick={() => setBaseResume(null)}
            >
              Remove
            </Button>
          </div>
        )}
      </div>

      {!baseResume ? (
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
              accept=".txt,.md,.doc,.docx"
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
              Supports .txt, .md, .doc, .docx files
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600">or</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <button
            onClick={handlePasteMode}
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
      ) : (
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
                    {formatRelativeTime(baseResume.uploadedAt)}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>File</span>
                  <span className="text-gray-300 font-medium truncate ml-2">
                    {baseResume.fileName}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Words</span>
                  <span className="text-gray-300 font-medium">
                    {baseResume.content.split(/\s+/).length.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Skills found</span>
                  <span className="text-gray-300 font-medium">
                    {baseResume.skills.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Star size={14} className="text-yellow-400" />
                <h3 className="text-sm font-semibold text-gray-200">Detected Skills</h3>
              </div>
              {baseResume.skills.length === 0 ? (
                <p className="text-xs text-gray-600">No skills detected</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {baseResume.skills.map((skill) => (
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
                {baseResume.fileName}
              </span>
            </div>
            <pre className="p-5 text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed overflow-auto max-h-[calc(100vh-280px)]">
              {baseResume.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
