"use client";

import { Button } from "@/components/ui/Button";

interface ResumeEditorProps {
  editContent: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ResumeEditor({ editContent, onChange, onSave, onCancel }: ResumeEditorProps) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Resume</h1>
          <p className="text-sm text-gray-400 mt-1">Paste or type your resume content below</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!editContent.trim()}>
            Save Resume
          </Button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <textarea
          value={editContent}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-[calc(100vh-220px)] bg-transparent text-gray-200 text-sm font-mono p-5 focus:outline-none resize-none"
          placeholder="Paste your resume content here..."
          autoFocus
        />
      </div>
    </div>
  );
}
