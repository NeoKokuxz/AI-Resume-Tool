"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { calculateATSScore } from "@/lib/ats-scorer";
import { createJob, deleteJobFromDb, createApplication } from "@/lib/db";
import { Job } from "@/types";
import { Plus, Briefcase, Zap } from "lucide-react";
import { JobCard } from "@/components/jobs/JobCard";
import { AddJobModal } from "@/components/jobs/AddJobModal";

export default function JobsPage() {
  const { jobs, addJob, deleteJob, addApplication, applications, baseResume } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [importBanner, setImportBanner] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/jobs/import");
        const data = await res.json();
        if (data.jobs && data.jobs.length > 0) {
          for (const job of data.jobs) {
            addJob({
              title: job.title || "Software Engineer",
              company: job.company || "Unknown Company",
              description: job.description || "",
              location: job.location || "Remote",
              url: job.url,
            });
          }
          setImportBanner(
            `${data.jobs.length} job${data.jobs.length > 1 ? "s" : ""} imported from extension`
          );
          setTimeout(() => setImportBanner(null), 4000);
        }
      } catch {
        // ignore polling errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [addJob]);

  // Form state
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  const appliedJobIds = new Set(applications.map((a) => a.jobId));

  function resetForm() {
    setTitle("");
    setCompany("");
    setLocation("");
    setUrl("");
    setDescription("");
  }

  async function handleAddJob() {
    if (!description.trim()) return;
    setIsAnalyzing(true);

    try {
      const atsResult = baseResume
        ? calculateATSScore(description, baseResume.content)
        : undefined;

      let resolvedTitle = title;
      let resolvedCompany = company;
      let resolvedLocation = location;

      if (!title || !company) {
        try {
          const res = await fetch("/api/analyze-job", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobDescription: description,
              resumeText: baseResume?.content,
            }),
          });
          const data = await res.json();
          if (data.analysis) {
            if (!resolvedTitle) resolvedTitle = data.analysis.title || "";
            if (!resolvedCompany) resolvedCompany = data.analysis.company || "";
            if (!resolvedLocation) resolvedLocation = data.analysis.location || "";
          }
        } catch {
          // Silently fail, use user-provided values
        }
      }

      const job = await createJob({
        title: resolvedTitle || "Software Engineer",
        company: resolvedCompany || "Unknown Company",
        description,
        location: resolvedLocation || location || "Remote",
        url: url || undefined,
        atsResult,
      });
      if (job) addJob(job);

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
      {importBanner && (
        <div className="mb-4 px-4 py-2.5 bg-indigo-950/60 border border-indigo-700/50 rounded-lg text-sm text-indigo-300 flex items-center gap-2">
          <Zap size={14} />
          {importBanner}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Job Listings</h1>
          <p className="text-sm text-gray-400 mt-1">
            {jobs.length} job{jobs.length !== 1 ? "s" : ""} tracked
            {!baseResume && (
              <span className="ml-2 text-yellow-400">
                · Upload a resume for ATS scoring
              </span>
            )}
          </p>
        </div>
        <Button
          icon={<Plus size={16} />}
          onClick={() => setIsModalOpen(true)}
        >
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
            />
          ))}
        </div>
      )}

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
