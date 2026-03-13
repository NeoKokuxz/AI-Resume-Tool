"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

interface SkillEditorProps {
  skills: string[];
  onAdd: (skill: string) => void;
  onRemove: (skill: string) => void;
}

export function SkillEditor({ skills, onAdd, onRemove }: SkillEditorProps) {
  const [skillInput, setSkillInput] = useState("");

  function handleAdd() {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setSkillInput("");
  }

  return (
    <div>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 focus-within:border-indigo-500 transition-colors">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs rounded-md"
            >
              {skill}
              <button onClick={() => onRemove(skill)} className="hover:text-white transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Type a skill and press Enter"
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!skillInput.trim()}
            className="text-indigo-400 hover:text-indigo-300 disabled:opacity-30 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-1">Press Enter or comma to add a skill</p>
    </div>
  );
}
