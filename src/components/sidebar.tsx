"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserCog, Settings, RotateCw, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "シフト一覧", icon: LayoutDashboard },
  { href: "/consult-flow", label: "初回コンサル", icon: ClipboardList },
  { href: "/instructors", label: "講師管理", icon: UserCog },
  { href: "/settings", label: "LINE通知設定", icon: Settings },
  { href: "/rotation", label: "繰り返し設定", icon: RotateCw },
];

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        mobile ? "h-full w-full" : "hidden md:flex md:w-60"
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sidebar-border bg-accent text-foreground text-xs font-bold shadow-sm">
          IM
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wide">講師業務管理</h1>
          <p className="text-[11px] font-medium text-muted-foreground">Instructor Board</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-all",
                isActive
                  ? "border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                  : "border-transparent text-sidebar-foreground/80 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                  isActive ? "border-white/35 bg-white/15 text-sidebar-primary-foreground" : "border-sidebar-border bg-white text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
