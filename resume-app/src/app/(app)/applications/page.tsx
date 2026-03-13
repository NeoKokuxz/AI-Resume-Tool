"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { updateApplicationInDb, deleteApplicationFromDb, saveTailoredResume, fetchResumeById } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ATSScoreRing } from "@/components/ui/ATSScoreRing";
import {
  getStatusColor,
  getStatusLabel,
  formatRelativeTime,
  cn,
} from "@/lib/utils";
import { APPLICATION_STATUSES, ApplicationStatus, Application } from "@/types";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import {
  KanbanSquare,
  Trash2,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  Briefcase,
  MapPin,
  Sparkles,
  StickyNote,
  X,
} from "lucide-react";

function DraggableCard({
  application,
  onDelete,
  onGenerateResume,
  isGenerating,
  onViewResume,
  onUpdateNotes,
}: {
  application: Application;
  onDelete: () => void;
  onGenerateResume: () => void;
  isGenerating: boolean;
  onViewResume: () => void;
  onUpdateNotes: (notes: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: application.id,
  });
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState(application.notes || "");

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-gray-900 border border-gray-800 rounded-xl p-3.5 cursor-grab active:cursor-grabbing select-none transition-all",
        isDragging && "opacity-50 border-indigo-700"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-200 leading-tight truncate">
            {application.job.title}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{application.job.company}</p>
        </div>
        {application.atsScore !== undefined && (
          <ATSScoreRing score={application.atsScore} size="sm" showLabel={false} />
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
        <MapPin size={10} />
        <span className="truncate">{application.job.location || "Unknown"}</span>
        <span>·</span>
        <span>{formatRelativeTime(application.appliedAt)}</span>
      </div>

      {/* Notes */}
      {application.notes && !showNotes && (
        <div className="mb-2 text-xs text-gray-500 bg-gray-800/50 rounded-lg px-2.5 py-1.5 italic line-clamp-1">
          "{application.notes}"
        </div>
      )}

      {showNotes && (
        <div
          className="mb-2"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={() => {
              onUpdateNotes(noteText);
              setShowNotes(false);
            }}
            placeholder="Add notes..."
            className="textarea text-xs h-16"
            autoFocus
          />
        </div>
      )}

      {/* Actions */}
      <div
        className="flex items-center gap-1 pt-2 border-t border-gray-800"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {!application.tailoredResumeId ? (
          <button
            onClick={onGenerateResume}
            disabled={isGenerating}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Sparkles size={11} />
            )}
            {isGenerating ? "Generating..." : "AI Resume"}
          </button>
        ) : (
          <button
            onClick={onViewResume}
            className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
          >
            <FileText size={11} />
            View Resume
          </button>
        )}
        <span className="text-gray-700 mx-1">·</span>
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-400 transition-colors"
        >
          <StickyNote size={11} />
          Notes
        </button>
        <span className="flex-1" />
        <button
          onClick={onDelete}
          className="text-gray-700 hover:text-red-400 transition-colors"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

function DroppableColumn({
  status,
  label,
  count,
  children,
}: {
  status: ApplicationStatus;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const headerColors: Record<ApplicationStatus, string> = {
    saved: "border-gray-600",
    applied: "border-blue-600",
    ats_passed: "border-purple-600",
    recruiter_contact: "border-yellow-600",
    interview: "border-orange-600",
    offer: "border-green-600",
    rejected: "border-red-600",
  };

  return (
    <div
      className={cn(
        "flex-shrink-0 w-64 flex flex-col h-full rounded-xl transition-all duration-150",
        isOver ? "bg-indigo-950/20 ring-2 ring-indigo-600/50 ring-inset" : ""
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between mx-2 mt-2 mb-2 pb-2 border-b-2 flex-shrink-0",
          headerColors[status]
        )}
      >
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
          {label}
        </span>
        <Badge
          variant={
            status === "offer" ? "success" :
            status === "rejected" ? "danger" :
            status === "interview" ? "warning" : "default"
          }
        >
          {count}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto rounded-lg mx-2 mb-2 p-2 space-y-2 transition-colors",
          isOver ? "bg-indigo-950/30" : "bg-gray-900/30"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  const { applications, updateApplicationStatus, deleteApplication, updateApplication, baseResume, jobs } =
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
        // Save tailored resume to resumes table, get back its ID
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
    <div className="flex flex-col" style={{ height: '100vh' }}>
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
                <DroppableColumn
                  key={value}
                  status={value}
                  label={label}
                  count={groupedApplications[value].length}
                >
                  {groupedApplications[value].map((app) => (
                    <DraggableCard
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
                </DroppableColumn>
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

      {/* Resume Viewer Modal */}
      <Modal
        isOpen={!!viewingApplication}
        onClose={() => { setViewingApplication(null); setViewingResumeContent(null); }}
        title={`Tailored Resume — ${viewingApplication?.job.title} at ${viewingApplication?.job.company}`}
        size="xl"
      >
        {viewingApplication && (
          <div className="space-y-4">
            {loadingResume ? (
              <div className="flex items-center justify-center py-12 gap-3 text-gray-500">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Loading resume...</span>
              </div>
            ) : (
              <>
                {viewingResumeContent?.resume && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={14} className="text-green-400" />
                      <h3 className="text-sm font-semibold text-gray-300">Tailored Resume</h3>
                    </div>
                    <pre className="bg-gray-800 rounded-xl p-4 text-xs text-gray-300 whitespace-pre-wrap font-mono max-h-72 overflow-y-auto leading-relaxed">
                      {viewingResumeContent.resume}
                    </pre>
                  </div>
                )}
                {viewingResumeContent?.coverLetter && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase size={14} className="text-blue-400" />
                      <h3 className="text-sm font-semibold text-gray-300">Cover Letter</h3>
                    </div>
                    <pre className="bg-gray-800 rounded-xl p-4 text-xs text-gray-300 whitespace-pre-wrap font-mono max-h-52 overflow-y-auto leading-relaxed">
                      {viewingResumeContent.coverLetter}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
