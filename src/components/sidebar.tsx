"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  LayoutDashboard,
  Ship,
  FileStack,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/book-order", label: "Book order", icon: ClipboardList },
  { href: "/customs", label: "Customs", icon: FileStack },
] as const;

const STORAGE_KEY = "ff-sidebar-expanded";

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "0") setExpanded(false);
    } catch {
      // ignore
    }
  }, []);

  const setSidebarExpanded = (next: boolean) => {
    setExpanded(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  };

  return (
    <aside
      className={`flex h-full min-h-0 shrink-0 flex-col self-stretch bg-sidebar text-sidebar-foreground transition-[width] duration-200 ${
        expanded ? "w-[240px]" : "w-[72px]"
      }`}
    >
      <div
        className={`border-b border-white/10 ${expanded ? "px-5 py-6" : "px-3 py-5"}`}
      >
        <div
          className={`flex ${expanded ? "items-start justify-between gap-2" : "flex-col items-center gap-3"}`}
        >
          <div className={`flex items-center ${expanded ? "gap-2.5" : ""}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2a9dba] text-white">
              <Ship className="h-5 w-5" strokeWidth={2.2} />
            </div>
            {expanded ? (
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[#7eb8d0]">
                  HarborLane
                </p>
                <p className="text-sm font-semibold tracking-tight text-white">
                  Freight Forwarder
                </p>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setSidebarExpanded(!expanded)}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#7eb8d0] transition-colors hover:bg-white/10 hover:text-white"
            aria-label={expanded ? "Minimize sidebar" : "Expand sidebar"}
            title={expanded ? "Minimize sidebar" : "Expand sidebar"}
          >
            {expanded ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <nav
        className={`flex flex-1 flex-col gap-1 ${expanded ? "p-3" : "items-center px-2 py-3"}`}
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
                expanded
                  ? "gap-2.5 px-3 py-2.5"
                  : "h-10 w-10 justify-center"
              } ${
                active
                  ? "bg-sidebar-active text-white"
                  : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {expanded ? label : null}
            </Link>
          );
        })}
      </nav>

      {expanded ? (
        <div className="border-t border-white/10 px-4 py-4 text-xs text-[#7eb8d0]">
          Sample booking workspace
        </div>
      ) : (
        <div className="border-t border-white/10 py-3" />
      )}
    </aside>
  );
}
