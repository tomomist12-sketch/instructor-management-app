"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserCog, Settings, RotateCw, List } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "シフト一覧", icon: LayoutDashboard },
  { href: "/rotation", label: "繰り返し設定", icon: RotateCw },
  { href: "/consults", label: "コンサル一覧", icon: List },
  { href: "/instructors", label: "講師管理", icon: UserCog },
  { href: "/settings", label: "LINE通知設定", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-56 md:flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
          IM
        </div>
        <h1 className="text-sm font-bold">講師業務管理</h1>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
