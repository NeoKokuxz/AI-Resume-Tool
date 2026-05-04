"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { STUDY_MODELS, type StudyModelOption } from "@/lib/study-utils";

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  /** "sm" for inline buttons, "md" for the plan generator footer */
  size?: "sm" | "md";
  /** Where the menu aligns horizontally relative to the button */
  align?: "left" | "right";
  /**
   * Open the menu upward instead of downward. Use this when the selector
   * sits inside a footer or near the bottom of an `overflow-hidden` parent
   * where a downward menu would be clipped.
   */
  direction?: "up" | "down";
}

export function ModelSelector({
  value,
  onChange,
  disabled = false,
  size = "sm",
  align = "right",
  direction = "down",
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected: StudyModelOption =
    STUDY_MODELS.find((m) => m.id === value) ?? STUDY_MODELS[0];

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const buttonSizeClasses =
    size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm";
  const iconSize = size === "sm" ? 12 : 13;

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/60 font-medium text-gray-300 transition-colors hover:border-indigo-700/60 hover:text-indigo-300",
          "disabled:cursor-not-allowed disabled:opacity-50",
          buttonSizeClasses
        )}
      >
        <Cpu size={iconSize} className="text-gray-500" />
        <span>{selected.name}</span>
        <ChevronDown
          size={iconSize}
          className={cn("transition-transform", open ? "rotate-180" : "rotate-0")}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute z-30 w-64 overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-lg",
            direction === "up" ? "bottom-full mb-1" : "top-full mt-1",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="border-b border-gray-800 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              AI model
            </p>
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {STUDY_MODELS.map((m) => {
              const isActive = m.id === value;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2 text-left transition-colors",
                      isActive ? "bg-indigo-950/40" : "hover:bg-gray-800"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border",
                        isActive
                          ? "border-indigo-500 bg-indigo-600 text-white"
                          : "border-gray-700 bg-gray-900"
                      )}
                    >
                      {isActive && <Check size={10} strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium leading-tight",
                          isActive ? "text-indigo-200" : "text-gray-200"
                        )}
                      >
                        {m.name}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
                        {m.description}
                      </p>
                      <p className="mt-1 truncate font-mono text-[10px] text-gray-600">
                        {m.id}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
