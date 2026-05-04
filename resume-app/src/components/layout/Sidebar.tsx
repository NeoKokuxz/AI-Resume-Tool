"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  KanbanSquare,
  Mail,
  Bot,
  BookOpen,
  Mic,
  MessagesSquare,
  ChevronRight,
  ChevronDown,
  LogOut,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { fetchUserProfile } from "@/lib/db";

type LeafItem = { kind: "leaf"; href: string; label: string; icon: LucideIcon };
type GroupItem = {
  kind: "group";
  id: string;
  label: string;
  icon: LucideIcon;
  children: { href: string; label: string; icon: LucideIcon }[];
};
type NavItem = LeafItem | GroupItem;

const navItems: NavItem[] = [
  { kind: "leaf", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { kind: "leaf", href: "/resume", label: "My Resume", icon: FileText },
  { kind: "leaf", href: "/jobs", label: "Job Listings", icon: Briefcase },
  { kind: "leaf", href: "/applications", label: "Applications", icon: KanbanSquare },
  { kind: "leaf", href: "/email", label: "Email Monitor", icon: Mail },
  {
    kind: "group",
    id: "interview-prep",
    label: "Interview Prep",
    icon: MessagesSquare,
    children: [
      { href: "/study", label: "Study", icon: BookOpen },
      { href: "/interview", label: "Interview", icon: Mic },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userName, setUserName] = useState("");
  const [userTitle, setUserTitle] = useState("");

  // Track expanded groups. Auto-expand when one of the children is active.
  const initialExpanded = useMemo(() => {
    const set = new Set<string>();
    navItems.forEach((item) => {
      if (item.kind === "group" && item.children.some((c) => pathname === c.href)) {
        set.add(item.id);
      }
    });
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);

  // Re-expand when navigating into a child via direct link
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      let changed = false;
      navItems.forEach((item) => {
        if (item.kind === "group" && item.children.some((c) => pathname === c.href) && !next.has(item.id)) {
          next.add(item.id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [pathname]);

  function toggleGroup(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    fetchUserProfile().then((p) => {
      if (p?.fullName) setUserName(p.fullName);
      if (p?.workTitle) setUserTitle(p.workTitle);
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = userName
    ? userName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <aside className="w-60 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Bot className="w-4.5 h-4.5 text-white" size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">AI Job Agent</p>
            <p className="text-xs text-gray-500 mt-0.5">Resume Optimizer</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          if (item.kind === "leaf") {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                  isActive
                    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-600/30"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                )}
              >
                <Icon
                  size={17}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    isActive ? "text-indigo-400" : "text-gray-500 group-hover:text-gray-300"
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight size={14} className="text-indigo-400 opacity-60" />}
              </Link>
            );
          }

          // Group
          const Icon = item.icon;
          const isOpen = expanded.has(item.id);
          const hasActiveChild = item.children.some((c) => pathname === c.href);

          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => toggleGroup(item.id)}
                aria-expanded={isOpen}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group w-full",
                  hasActiveChild && !isOpen
                    ? "text-indigo-400"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                )}
              >
                <Icon
                  size={17}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    hasActiveChild ? "text-indigo-400" : "text-gray-500 group-hover:text-gray-300"
                  )}
                />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown
                  size={14}
                  className={cn(
                    "flex-shrink-0 text-gray-500 transition-transform",
                    isOpen ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>

              {isOpen && (
                <div className="mt-0.5 ml-3 pl-3 border-l border-gray-800 space-y-0.5">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const isActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group",
                          isActive
                            ? "bg-indigo-600/20 text-indigo-400 border border-indigo-600/30"
                            : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                        )}
                      >
                        <ChildIcon
                          size={14}
                          className={cn(
                            "flex-shrink-0 transition-colors",
                            isActive ? "text-indigo-400" : "text-gray-500 group-hover:text-gray-300"
                          )}
                        />
                        <span className="flex-1">{child.label}</span>
                        {isActive && <ChevronRight size={12} className="text-indigo-400 opacity-60" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-1">
        {/* Profile link */}
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group w-full",
            pathname === "/profile"
              ? "bg-indigo-600/20 border border-indigo-600/30"
              : "hover:bg-gray-800"
          )}
        >
          <div className="w-7 h-7 bg-indigo-700 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials !== "?" ? initials : <UserCircle size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-medium truncate leading-tight",
              pathname === "/profile" ? "text-indigo-400" : "text-gray-300"
            )}>
              {userName || "My Profile"}
            </p>
            {userTitle && (
              <p className="text-xs text-gray-600 truncate">{userTitle}</p>
            )}
          </div>
          {pathname === "/profile" && <ChevronRight size={14} className="text-indigo-400 opacity-60 flex-shrink-0" />}
        </Link>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-all"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
