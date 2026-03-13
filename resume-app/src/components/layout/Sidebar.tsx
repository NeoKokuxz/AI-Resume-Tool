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
  ChevronRight,
  LogOut,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { fetchUserProfile } from "@/lib/db";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resume", label: "My Resume", icon: FileText },
  { href: "/jobs", label: "Job Listings", icon: Briefcase },
  { href: "/applications", label: "Applications", icon: KanbanSquare },
  { href: "/email", label: "Email Monitor", icon: Mail },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userName, setUserName] = useState("");
  const [userTitle, setUserTitle] = useState("");

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
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
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
