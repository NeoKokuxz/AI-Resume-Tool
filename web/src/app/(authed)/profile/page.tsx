"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { fetchUserProfile, updateUserProfile } from "@/lib/db";
import { UserProfile } from "@/types";
import {
  User,
  Briefcase,
  MapPin,
  Phone,
  Linkedin,
  Github,
  Clock,
  FileText,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileField } from "@/components/profile/ProfileField";
import { SkillEditor } from "@/components/profile/SkillEditor";

export default function ProfilePage() {
  const { baseResume } = useAppStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchUserProfile().then((p) => {
      setProfile(p ?? { onboarded: true });
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    await updateUserProfile(profile);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function addSkill(skill: string) {
    if (!profile) return;
    if (!profile.skills?.includes(skill)) {
      setProfile((p) => p ? { ...p, skills: [...(p.skills ?? []), skill] } : p);
    }
  }

  function removeSkill(skill: string) {
    setProfile((p) => p ? { ...p, skills: (p.skills ?? []).filter((s) => s !== skill) } : p);
  }

  const initials = profile?.fullName
    ? profile.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={24} className="text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
          <p className="text-sm text-gray-400 mt-1">Your personal details used for job applications and auto-fill</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            saved
              ? "bg-green-700 text-green-200"
              : "bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-indigo-400 text-white"
          )}
        >
          {saving ? (
            <><Loader2 size={14} className="animate-spin" /> Saving...</>
          ) : saved ? (
            <><CheckCircle size={14} /> Saved</>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>

      <div className="space-y-5">
        {/* Avatar + Name card */}
        <div className="card p-5 flex items-center gap-5">
          <div className="w-16 h-16 bg-indigo-700 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-white truncate">{profile?.fullName || "—"}</p>
            <p className="text-sm text-gray-400 mt-0.5">{profile?.workTitle || "No title set"}</p>
            <p className="text-xs text-gray-600 mt-1">{profile?.location || "No location set"}</p>
          </div>
          {baseResume ? (
            <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-950 border border-green-800 px-2.5 py-1 rounded-lg flex-shrink-0">
              <CheckCircle size={11} />
              Resume active
            </div>
          ) : (
            <a
              href="/resume"
              className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-800 border border-gray-700 hover:border-indigo-600 hover:text-indigo-400 px-2.5 py-1 rounded-lg flex-shrink-0 transition-colors"
            >
              <FileText size={11} />
              No resume — upload one
            </a>
          )}
        </div>

        {/* Basic info */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProfileField
              label="Full Name"
              icon={<User size={12} />}
              value={profile?.fullName ?? ""}
              onChange={(v) => setProfile((p) => p ? { ...p, fullName: v } : p)}
              placeholder="Jane Smith"
            />
            <ProfileField
              label="Current Title"
              icon={<Briefcase size={12} />}
              value={profile?.workTitle ?? ""}
              onChange={(v) => setProfile((p) => p ? { ...p, workTitle: v } : p)}
              placeholder="Software Engineer"
            />
            <ProfileField
              label="Location"
              icon={<MapPin size={12} />}
              value={profile?.location ?? ""}
              onChange={(v) => setProfile((p) => p ? { ...p, location: v } : p)}
              placeholder="San Francisco, CA"
            />
            <ProfileField
              label="Years of Experience"
              icon={<Clock size={12} />}
              value={profile?.yearsExperience?.toString() ?? ""}
              onChange={(v) => setProfile((p) => p ? { ...p, yearsExperience: parseInt(v) || 0 } : p)}
              placeholder="5"
              type="number"
            />
            <ProfileField
              label="Phone"
              icon={<Phone size={12} />}
              value={profile?.phone ?? ""}
              onChange={(v) => setProfile((p) => p ? { ...p, phone: v } : p)}
              placeholder="+1 555 000 0000"
            />
          </div>
        </div>

        {/* Online presence */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Online Presence</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProfileField
              label="LinkedIn"
              icon={<Linkedin size={12} />}
              value={profile?.linkedin ?? ""}
              onChange={(v) => setProfile((p) => p ? { ...p, linkedin: v } : p)}
              placeholder="https://linkedin.com/in/..."
            />
            <ProfileField
              label="GitHub"
              icon={<Github size={12} />}
              value={profile?.github ?? ""}
              onChange={(v) => setProfile((p) => p ? { ...p, github: v } : p)}
              placeholder="https://github.com/..."
            />
          </div>
        </div>

        {/* Skills */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <FileText size={13} className="text-gray-500" />
            Skills
          </h2>
          <SkillEditor
            skills={profile?.skills ?? []}
            onAdd={addSkill}
            onRemove={removeSkill}
          />
        </div>
      </div>
    </div>
  );
}
