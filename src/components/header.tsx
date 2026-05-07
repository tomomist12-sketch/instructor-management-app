"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

const pageTitles: Record<string, string> = {
  "/": "シフト一覧",
  "/rotation": "繰り返し設定",
  "/consult-flow": "初回コンサル",
  "/instructors": "講師管理",
  "/settings": "LINE通知設定",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(path) && path !== "/") return title;
  }
  return "講師業務管理";
}

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-background/95 px-4 shadow-sm sm:px-6">
      <Sheet>
        <SheetTrigger className="inline-flex items-center justify-center rounded-lg border border-border bg-card p-2 shadow-sm hover:bg-accent md:hidden">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <Sidebar mobile />
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2.5">
        <span className="h-7 w-1 rounded-full bg-chart-1" />
        <h2 className="text-base font-bold tracking-wide">{title}</h2>
      </div>
    </header>
  );
}
