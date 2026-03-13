"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { updateApplicationInDb, deleteApplicationFromDb, saveTailoredResume, fetchResumeById } from "@/lib/db";
import { APPLICATION_STATUSES, ApplicationStatus, Application } from "@/types";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanSquare } from "lucide-react";
import { ApplicationCard } from "@/components/applications/ApplicationCard";
import { KanbanColumn } from "@/components/applications/KanbanColumn";
import { ResumeModal } from "@/components/applications/ResumeModal";

export default function ApplicationsPage() {
  const { applications, updateApplicationStatus, deleteApplication, updateApplication, baseResume } =
    useAppStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [viewingApplication, setViewingApplication] = useState<Application | null>(null);
  const [viewingResumeContent, setViewingResumeContent] = useState<{ resume: string; coverLetter: string } | null>(null);
  const [loadingResume, setLoadingResume] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const applicationId = active.id as string;
    const newStatus = over.id as ApplicationStatus;
    const validStatuses: ApplicationStatus[] = [
      "saved", "applied", "ats_passed", "recruiter_contact",
      "interview", "offer", "rejected",
    ];

    if (validStatuses.includes(newStatus)) {
      updateApplicationStatus(applicationId, newStatus);
      updateApplicationInDb(applicationId, { status: newStatus });
    }
  }

  async function handleGenerateResume(application: Application) {
    if (!baseResume) {
      alert("Please upload a base resume first.");
      return;
    }

    setGeneratingId(application.id);
    try {
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseResume: baseResume.content,
          jobDescription: application.job.description,
          jobTitle: application.job.title,
          company: application.job.company,
        }),
      });

      const data = await res.json();
      if (data.tailoredResume) {
        const tailoredResumeId = await saveTailoredResume(
          data.tailoredResume,
          application.job.title,
          application.job.company
        );
        const updates = { tailoredResumeId: tailoredResumeId ?? undefined, coverLetter: data.coverLetter };
        updateApplication(application.id, updates);
        updateApplicationInDb(application.id, updates);
        setViewingApplication({ ...application, ...updates });
        setViewingResumeContent({ resume: data.tailoredResume, coverLetter: data.coverLetter });
      }
    } catch (error) {
      console.error("Failed to generate resume:", error);
    } finally {
      setGeneratingId(null);
    }
  }

  const activeApplication = activeId
    ? applications.find((a) => a.id === activeId)
    : null;

  const groupedApplications = APPLICATION_STATUSES.reduce((acc, { value }) => {
    acc[value] = applications.filter((a) => a.status === value);
    return acc;
  }, {} as Record<ApplicationStatus, Application[]>);

  return (
    <div className="flex flex-col" style={{ height: "100vh" }}>
      <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Application Pipeline</h1>
          <p className="text-sm text-gray-400 mt-1">
            Drag & drop to update status · {applications.length} total applications
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <KanbanSquare size={14} />
          <span>Kanban Board</span>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="card p-12 text-center max-w-md">
            <KanbanSquare size={32} className="text-gray-700 mx-auto mb-4" />
            <p className="text-base font-medium text-gray-400 mb-1">No applications tracked</p>
            <p className="text-sm text-gray-600">
              Add jobs and click "Track Application" to start your pipeline
            </p>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden px-6 pb-6">
            <div className="flex gap-4 h-full">
              {APPLICATION_STATUSES.map(({ value, label }) => (
                <KanbanColumn
                  key={value}
                  status={value}
                  label={label}
                  count={groupedApplications[value].length}
                >
                  {groupedApplications[value].map((app) => (
                    <ApplicationCard
                      key={app.id}
                      application={app}
                      onDelete={() => { deleteApplicationFromDb(app.id); deleteApplication(app.id); }}
                      onGenerateResume={() => handleGenerateResume(app)}
                      isGenerating={generatingId === app.id}
                      onViewResume={async () => {
                        setViewingApplication(app);
                        setViewingResumeContent(null);
                        setLoadingResume(true);
                        if (app.tailoredResumeId) {
                          const r = await fetchResumeById(app.tailoredResumeId);
                          setViewingResumeContent(r ? { resume: r.content, coverLetter: app.coverLetter || "" } : null);
                        }
                        setLoadingResume(false);
                      }}
                      onUpdateNotes={(notes) => { updateApplication(app.id, { notes }); updateApplicationInDb(app.id, { notes }); }}
                    />
                  ))}
                </KanbanColumn>
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeApplication && (
              <div className="bg-gray-900 border border-indigo-600 rounded-xl p-3.5 shadow-2xl w-64">
                <p className="text-sm font-medium text-gray-200">{activeApplication.job.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{activeApplication.job.company}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <ResumeModal
        application={viewingApplication}
        resumeContent={viewingResumeContent}
        loading={loadingResume}
        onClose={() => { setViewingApplication(null); setViewingResumeContent(null); }}
      />
    </div>
  );
}
