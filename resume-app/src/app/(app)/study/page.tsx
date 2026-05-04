"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { fetchUserProfile } from "@/lib/db";
import { StudyHeader } from "@/components/study/StudyHeader";
import { StudyPlanGenerator } from "@/components/study/StudyPlanGenerator";
import { StudyChapterModal } from "@/components/study/StudyChapterModal";
import { AddChapterDialog } from "@/components/study/AddChapterDialog";
import { ChapterSections } from "@/components/study/ChapterSections";
import { StudyEmptyState } from "@/components/study/StudyEmptyState";
import {
  StudyErrorBanner,
  StudyStaleBanner,
  StudyHydratingSpinner,
  StudyOverview,
} from "@/components/study/StudyBanners";
import type { StudyChapter, StudyPlan } from "@/types";

interface PlanResponse {
  prompt?: string;
  generatedAt?: string;
  overview?: string;
  chapters?: StudyChapter[];
  error?: string;
  saveError?: string | null;
}

export default function StudyPage() {
  const { baseResume } = useAppStore();
  const [profile, setProfile] = useState<{ fullName: string; workTitle: string; skills: string[] }>({
    fullName: "",
    workTitle: "",
    skills: [],
  });
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [openChapterIdx, setOpenChapterIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // Chat starts hidden. Once hydration finishes (effect below) we open it
  // when there's no plan to nudge the user to generate one.
  const [chatVisible, setChatVisible] = useState(false);

  // Fetch user profile for the header
  useEffect(() => {
    fetchUserProfile().then((p) => {
      if (!p) return;
      setProfile({
        fullName: p.fullName || "",
        workTitle: p.workTitle || "",
        skills: p.skills || [],
      });
    });
  }, []);

  // Hydrate cached plan on mount; default chat-open state once we know
  useEffect(() => {
    let cancelled = false;
    fetch("/api/study-plan")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.plan) {
          setPlan({
            prompt: data.plan.prompt || "",
            generatedAt: data.plan.generatedAt,
            overview: data.plan.overview || "",
            chapters: data.plan.chapters || [],
          });
          setIsStale(Boolean(data.isStale));
          setChatVisible(false);
        } else {
          setChatVisible(true);
        }
      })
      .catch(() => {
        if (!cancelled) setChatVisible(true);
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function generate(prompt: string, model: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model }),
      });

      let data: PlanResponse | null = null;
      let bodyText = "";
      try { data = await res.json(); } catch { bodyText = await res.text().catch(() => ""); }

      if (!res.ok) {
        const reason = data?.error || bodyText || res.statusText || "Unknown error";
        throw new Error(`${res.status} ${res.statusText} — ${reason}`);
      }
      if (!data) throw new Error("Empty response from server");

      setPlan({
        prompt: data.prompt || "",
        generatedAt: data.generatedAt || new Date().toISOString(),
        overview: data.overview || "",
        chapters: data.chapters || [],
      });
      setIsStale(false);
      setChatVisible(false);

      // Generation succeeded but cache write failed — warn, don't fail
      if (data.saveError) {
        setError(`Plan generated but couldn't be saved: ${data.saveError}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const openChapter: StudyChapter | null =
    openChapterIdx !== null && plan ? plan.chapters[openChapterIdx] ?? null : null;
  const hasChapters = !!plan && plan.chapters.length > 0;

  return (
    <div className="flex h-full flex-col bg-gray-950">
      <StudyHeader
        fullName={profile.fullName}
        workTitle={profile.workTitle}
        skills={profile.skills}
        chatVisible={chatVisible}
        onToggleChat={() => setChatVisible((v) => !v)}
      />

      {chatVisible && (
        <StudyPlanGenerator
          onGenerate={generate}
          loading={loading}
          hasPlan={!!plan}
        />
      )}

      <div className="flex-1 px-8 pb-10 pt-4">
        {error && (
          <StudyErrorBanner
            message={error}
            hasResume={!!baseResume}
            onDismiss={() => setError(null)}
          />
        )}

        {isStale && plan && <StudyStaleBanner />}

        {plan && <StudyOverview overview={plan.overview} />}

        {hydrating ? (
          <StudyHydratingSpinner />
        ) : hasChapters && plan ? (
          <ChapterSections
            chapters={plan.chapters}
            onOpenChapter={(i) => setOpenChapterIdx(i)}
            onAddTopic={() => setAddOpen(true)}
          />
        ) : !loading && !error ? (
          <StudyEmptyState
            hasResume={!!baseResume}
            chatVisible={chatVisible}
            onShowChat={() => setChatVisible(true)}
          />
        ) : null}
      </div>

      <StudyChapterModal
        chapter={openChapter}
        index={openChapterIdx ?? 0}
        onClose={() => setOpenChapterIdx(null)}
        onChapterUpdate={(updated) => {
          setPlan((prev) =>
            prev
              ? {
                  ...prev,
                  chapters: prev.chapters.map((c) => (c.id === updated.id ? updated : c)),
                }
              : prev
          );
        }}
      />

      <AddChapterDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(chapter) => {
          setPlan((prev) =>
            prev ? { ...prev, chapters: [...prev.chapters, chapter] } : prev
          );
        }}
      />
    </div>
  );
}
