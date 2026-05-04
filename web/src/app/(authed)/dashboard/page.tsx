"use client";

import { useAppStore } from "@/lib/store";
import { getStatusLabel, getStatusColor, formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  FileText,
  Mail,
  TrendingUp,
  Trophy,
  XCircle,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { ApplicationStatus } from "@/types";
import { StatCard } from "@/components/dashboard/StatCard";

export default function DashboardPage() {
  const { applications, jobs, emails, baseResume } = useAppStore();

  const totalApplications = applications.length;
  const interviews = applications.filter((a) => a.status === "interview").length;
  const offers = applications.filter((a) => a.status === "offer").length;
  const rejections = applications.filter((a) => a.status === "rejected").length;

  const statusCounts: Record<ApplicationStatus, number> = {
    saved: 0, applied: 0, ats_passed: 0, recruiter_contact: 0,
    interview: 0, offer: 0, rejected: 0,
  };
  applications.forEach((a) => statusCounts[a.status]++);

  const recentActivity = [
    ...applications.map((a) => ({
      id: a.id,
      type: "application" as const,
      text: `Applied to ${a.job.title} at ${a.job.company}`,
      status: a.status,
      time: a.appliedAt,
    })),
    ...emails.map((e) => ({
      id: e.id,
      type: "email" as const,
      text: e.subject,
      status: e.classification as string,
      time: e.receivedAt,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Track your job applications and optimize your resume with AI
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Applications"
          value={totalApplications}
          icon={Briefcase}
          color="text-blue-400"
          bg="bg-blue-950/50"
        />
        <StatCard
          label="Interviews"
          value={interviews}
          sub={totalApplications > 0 ? `${Math.round((interviews / totalApplications) * 100)}% rate` : "—"}
          icon={TrendingUp}
          color="text-orange-400"
          bg="bg-orange-950/50"
        />
        <StatCard
          label="Offers"
          value={offers}
          icon={Trophy}
          color="text-green-400"
          bg="bg-green-950/50"
        />
        <StatCard
          label="Rejections"
          value={rejections}
          icon={XCircle}
          color="text-red-400"
          bg="bg-red-950/50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Overview */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-100">Application Pipeline</h2>
            <Link
              href="/applications"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {(
              [
                "saved", "applied", "ats_passed", "recruiter_contact",
                "interview", "offer", "rejected",
              ] as ApplicationStatus[]
            ).map((status) => {
              const count = statusCounts[status];
              const pct = totalApplications > 0 ? (count / totalApplications) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-xs font-medium w-28 flex-shrink-0",
                      getStatusColor(status).split(" ")[0]
                    )}
                  >
                    {getStatusLabel(status)}
                  </span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        status === "saved" ? "bg-gray-500" :
                        status === "applied" ? "bg-blue-500" :
                        status === "ats_passed" ? "bg-purple-500" :
                        status === "recruiter_contact" ? "bg-yellow-500" :
                        status === "interview" ? "bg-orange-500" :
                        status === "offer" ? "bg-green-500" : "bg-red-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-100">Recent Activity</h2>
            <Clock size={15} className="text-gray-600" />
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-6">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                      item.type === "email" ? "bg-indigo-950" : "bg-gray-800"
                    )}
                  >
                    {item.type === "email" ? (
                      <Mail size={13} className="text-indigo-400" />
                    ) : (
                      <Briefcase size={13} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 leading-snug line-clamp-2">
                      {item.text}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {formatRelativeTime(item.time)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/jobs"
          className="card p-4 hover:border-indigo-700 hover:bg-gray-900/50 transition-all group flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-indigo-950 rounded-lg flex items-center justify-center group-hover:bg-indigo-900 transition-colors">
            <Zap size={18} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-200">Add New Job</p>
            <p className="text-xs text-gray-500">Paste job description & get ATS score</p>
          </div>
        </Link>
        <Link
          href="/resume"
          className="card p-4 hover:border-indigo-700 hover:bg-gray-900/50 transition-all group flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-green-950 rounded-lg flex items-center justify-center group-hover:bg-green-900 transition-colors">
            <FileText size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-200">
              {baseResume ? "Update Resume" : "Upload Resume"}
            </p>
            <p className="text-xs text-gray-500">
              {baseResume ? `Last updated ${formatRelativeTime(baseResume.uploadedAt)}` : "No resume uploaded yet"}
            </p>
          </div>
        </Link>
        <Link
          href="/email"
          className="card p-4 hover:border-indigo-700 hover:bg-gray-900/50 transition-all group flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-purple-950 rounded-lg flex items-center justify-center group-hover:bg-purple-900 transition-colors">
            <Mail size={18} className="text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-200">Email Monitor</p>
            <p className="text-xs text-gray-500">{emails.length} emails classified</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
