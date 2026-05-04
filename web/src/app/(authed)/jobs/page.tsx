"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { calculateATSScore } from "@/lib/ats-scorer";
import { createJob, deleteJobFromDb, createApplication, fetchAll, fetchResumeById } from "@/lib/db";
import { Application, Job } from "@/types";
import { Plus, Briefcase } from "lucide-react";
import { JobCard } from "@/components/jobs/JobCard";
import { AddJobModal } from "@/components/jobs/AddJobModal";
import { ResumeModal } from "@/components/applications/ResumeModal";
import { useAIOperation } from "@/lib/ai-queue/realtime";

export default function JobsPage() {
  const { jobs, addJob, deleteJob, addApplication, applications, baseResume, hydrate } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);

  useAIOperation({
    operationId,
    onSuccess: async () => {
      const data = await fetchAll();
      if (data) hydrate(data);
      setOperationId(null);
    },
    onError: () => setOperationId(null),
  });


  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  const [viewingApplication, setViewingApplication] = useState<Application | null>(null);
  const [viewingResumeContent, setViewingResumeContent] = useState<{ resume: string; coverLetter: string } | null>(null);
  const [tailoredPdfStoragePath, setTailoredPdfStoragePath] = useState<string | undefined>();
  const [loadingResume, setLoadingResume] = useState(false);

  const appliedJobIds = new Set(applications.map((a) => a.jobId));
  const applicationByJobId = Object.fromEntries(applications.map((a) => [a.jobId, a]));

  async function handleViewTailoredResume(app: Application) {
    setViewingApplication(app);
    setViewingResumeContent(null);
    setTailoredPdfStoragePath(undefined);
    setLoadingResume(true);
    if (app.tailoredResumeId) {
      const r = await fetchResumeById(app.tailoredResumeId);
      setViewingResumeContent(r ? { resume: r.content, coverLetter: app.coverLetter || "" } : null);
      setTailoredPdfStoragePath(r?.pdfStoragePath);
    }
    setLoadingResume(false);
  }

  function resetForm() {
    setTitle(""); setCompany(""); setLocation(""); setUrl(""); setDescription("");
  }

  async function handleAddJob() {
    if (!description.trim()) return;
    setIsAnalyzing(true);

    try {
      const atsResult = baseResume
        ? calculateATSScore(description, baseResume.content)
        : undefined;

      // Create job immediately with what we have
      const job = await createJob({
        title: title || "Software Engineer",
        company: company || "Unknown Company",
        description,
        location: location || "Remote",
        url: url || undefined,
        atsResult,
      });
      if (job) addJob(job);

      // Enqueue AI analysis to fill in missing title/company/location in background
      if (job && (!title || !company)) {
        const res = await fetch("/api/ai-queue/enqueue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operationType: "analyze_job",
            payload: {
              jobDescription: description,
              jobId: job.id,
            },
          }),
        });
        const data = await res.json();
        if (data.operationId) setOperationId(data.operationId);
      }

      resetForm();
      setIsModalOpen(false);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleCreateApplication(job: Job) {
    const app = await createApplication({
      jobId: job.id,
      job,
      status: "saved",
      atsScore: job.atsResult?.score,
    });
    if (app) addApplication(app);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    resetForm();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Job Listings</h1>
          <p className="text-sm text-gray-400 mt-1">
            {jobs.length} job{jobs.length !== 1 ? "s" : ""} tracked
            {!baseResume && (
              <span className="ml-2 text-yellow-400">· Upload a resume for ATS scoring</span>
            )}
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
          Add Job
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase size={24} className="text-gray-600" />
          </div>
          <p className="text-base font-medium text-gray-400 mb-1">No jobs added yet</p>
          <p className="text-sm text-gray-600 mb-4">
            Add job descriptions to get ATS scores and track applications
          </p>
          <Button icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
            Add Your First Job
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onDelete={() => { deleteJobFromDb(job.id); deleteJob(job.id); }}
              onCreateApplication={handleCreateApplication}
              hasApplication={appliedJobIds.has(job.id)}
              application={applicationByJobId[job.id]}
              onViewTailoredResume={() => {
                const app = applicationByJobId[job.id];
                if (app) handleViewTailoredResume(app);
              }}
            />
          ))}
        </div>
      )}

      <ResumeModal
        application={viewingApplication}
        resumeContent={viewingResumeContent}
        loading={loadingResume}
        originalPdfStoragePath={baseResume?.pdfStoragePath}
        tailoredPdfStoragePath={tailoredPdfStoragePath}
        onClose={() => { setViewingApplication(null); setViewingResumeContent(null); setTailoredPdfStoragePath(undefined); }}
      />

      <AddJobModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={title}
        company={company}
        location={location}
        url={url}
        description={description}
        isAnalyzing={isAnalyzing}
        hasResume={!!baseResume}
        onTitleChange={setTitle}
        onCompanyChange={setCompany}
        onLocationChange={setLocation}
        onUrlChange={setUrl}
        onDescriptionChange={setDescription}
        onSubmit={handleAddJob}
      />
    </div>
  );
}
