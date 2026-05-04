"use client";

import { ExternalLink } from "lucide-react";
import { RESOURCE_ICONS } from "@/lib/study-utils";
import type { StudyResource } from "@/types";

const itemClassName =
  "group flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/50 p-3 transition-colors hover:border-indigo-700/60 hover:bg-gray-900";

export function ResourceList({ resources }: { resources: StudyResource[] }) {
  if (!resources?.length) return null;
  return (
    <ul className="mt-3 space-y-2">
      {resources.map((r, i) => {
        const inner = (
          <>
            <span className="text-base" aria-hidden>
              {RESOURCE_ICONS[r.type] ?? "🔗"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-100 group-hover:text-indigo-300">
                {r.title}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">{r.type}</p>
            </div>
            {r.url && (
              <ExternalLink
                size={14}
                className="flex-shrink-0 text-gray-500 group-hover:text-indigo-300"
              />
            )}
          </>
        );
        return (
          <li key={i}>
            {r.url ? (
              <a href={r.url} target="_blank" rel="noopener noreferrer" className={itemClassName}>
                {inner}
              </a>
            ) : (
              <div className={itemClassName}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
