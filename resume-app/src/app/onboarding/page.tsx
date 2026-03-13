"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateUserProfile, fetchUserProfile, saveResume } from "@/lib/db";
import { UserProfile, Resume } from "@/types";
import { generateId } from "@/lib/utils";
import {
  Upload,
  Briefcase,
  Loader2,
  CheckCircle,
  X,
  Plus,
  ArrowRight,
  FileText,
  User,
  MapPin,
  Phone,
  Linkedin,
  Github,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "upload" | "extracting" | "review" | "saving";

interface ExtractedProfile {
  fullName: string;
  workTitle: string;
  yearsExperience: number;
  location: string;
  phone: string;
  linkedin: string;
  github: string;
  skills: string[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ExtractedProfile>({
    fullName: "",
    workTitle: "",
    yearsExperience: 0,
    location: "",
    phone: "",
    linkedin: "",
    github: "",
    skills: [],
  });
  const [skillInput, setSkillInput] = useState("");
  const [resumeFile, setResumeFile] = useState<{ name: string; text: string } | null>(null);

  // Redirect if already onboarded
  useEffect(() => {
    fetchUserProfile().then((p) => {
      if (p?.onboarded) router.replace("/");
    });
  }, []);

  async function handleFile(file: File) {
    setError("");
    setStep("extracting");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/extract-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to extract resume data. Please fill in manually.");
        setStep("review");
        return;
      }

      const ext: ExtractedProfile = data.extracted;
      setProfile({
        fullName: ext.fullName ?? "",
        workTitle: ext.workTitle ?? "",
        yearsExperience: ext.yearsExperience ?? 0,
        location: ext.location ?? "",
        phone: ext.phone ?? "",
        linkedin: ext.linkedin ?? "",
        github: ext.github ?? "",
        skills: Array.isArray(ext.skills) ? ext.skills : [],
      });
      if (data.resumeText) {
        setResumeFile({ name: file.name, text: data.resumeText });
      }
      setStep("review");
    } catch {
      setError("Failed to process file. Please fill in manually.");
      setStep("review");
    }
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

  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !profile.skills.includes(trimmed)) {
      setProfile((p) => ({ ...p, skills: [...p.skills, trimmed] }));
    }
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setProfile((p) => ({ ...p, skills: p.skills.filter((s) => s !== skill) }));
  }

  async function handleConfirm() {
    setStep("saving");

    const saves: Promise<unknown>[] = [
      updateUserProfile({
        fullName: profile.fullName || undefined,
        workTitle: profile.workTitle || undefined,
        yearsExperience: profile.yearsExperience || undefined,
        location: profile.location || undefined,
        phone: profile.phone || undefined,
        linkedin: profile.linkedin || undefined,
        github: profile.github || undefined,
        skills: profile.skills.length > 0 ? profile.skills : undefined,
        onboarded: true,
      }),
    ];

    if (resumeFile) {
      const resume: Resume = {
        id: generateId(),
        fileName: resumeFile.name,
        content: resumeFile.text,
        skills: profile.skills,
        uploadedAt: new Date().toISOString(),
      };
      saves.push(saveResume(resume));
    }

    await Promise.all(saves);
    router.push("/");
  }

  // ─── Upload step ──────────────────────────────────────────────────────────

  if (step === "upload" || step === "extracting") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Briefcase size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white">AI Job Agent</span>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Step 1 of 2</span>
              </div>
              <h1 className="text-xl font-bold text-white">Upload your resume</h1>
              <p className="text-sm text-gray-500 mt-1">
                We'll extract your details automatically. Supports PDF, TXT, MD.
              </p>
            </div>

            {step === "extracting" ? (
              <div className="border-2 border-dashed border-indigo-700 rounded-2xl p-12 text-center">
                <Loader2 size={32} className="text-indigo-400 animate-spin mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-300">Extracting your info...</p>
                <p className="text-xs text-gray-600 mt-1">Claude is reading your resume</p>
              </div>
            ) : (
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
                  or click to browse · PDF, TXT, MD, DOCX
                </p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => { setProfile({ fullName: "", workTitle: "", yearsExperience: 0, location: "", phone: "", linkedin: "", github: "", skills: [] }); setStep("review"); }}
                className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
              >
                Skip — fill in manually
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Review step ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Briefcase size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white">AI Job Agent</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={14} className="text-green-400" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Step 2 of 2</span>
            </div>
            <h1 className="text-xl font-bold text-white">Review your profile</h1>
            <p className="text-sm text-gray-500 mt-1">
              Confirm or edit the details we extracted. You can always update these later.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-yellow-950 border border-yellow-800 rounded-lg text-sm text-yellow-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Name + Title row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                  <User size={12} />
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                  <Briefcase size={12} />
                  Current Title
                </label>
                <input
                  type="text"
                  value={profile.workTitle}
                  onChange={(e) => setProfile((p) => ({ ...p, workTitle: e.target.value }))}
                  placeholder="Software Engineer"
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Location + Experience + Phone row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                  <MapPin size={12} />
                  Location
                </label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                  placeholder="San Francisco, CA"
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                  <Clock size={12} />
                  Years of Experience
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={profile.yearsExperience || ""}
                  onChange={(e) => setProfile((p) => ({ ...p, yearsExperience: parseInt(e.target.value) || 0 }))}
                  placeholder="5"
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                  <Phone size={12} />
                  Phone
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+1 555 000 0000"
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* LinkedIn + GitHub row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                  <Linkedin size={12} />
                  LinkedIn
                </label>
                <input
                  type="url"
                  value={profile.linkedin}
                  onChange={(e) => setProfile((p) => ({ ...p, linkedin: e.target.value }))}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                  <Github size={12} />
                  GitHub
                </label>
                <input
                  type="url"
                  value={profile.github}
                  onChange={(e) => setProfile((p) => ({ ...p, github: e.target.value }))}
                  placeholder="https://github.com/..."
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                <FileText size={12} />
                Skills
              </label>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 focus-within:border-indigo-500 transition-colors">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs rounded-md"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="hover:text-white transition-colors"
                      >
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
                        addSkill();
                      }
                    }}
                    placeholder="Type a skill and press Enter"
                    className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
                  />
                  <button
                    onClick={addSkill}
                    disabled={!skillInput.trim()}
                    className="text-indigo-400 hover:text-indigo-300 disabled:opacity-30 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-1">Press Enter or comma to add a skill</p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setStep("upload")}
              className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={step === "saving"}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-indigo-400 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {step === "saving" ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Go to Dashboard
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
