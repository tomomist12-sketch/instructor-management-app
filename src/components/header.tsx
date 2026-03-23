"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

const pageTitles: Record<string, string> = {
  "/": "シフト一覧",
  "/rotation": "繰り返し設定",
  "/consults": "初回コンサル一覧",
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
    <header className="flex h-14 items-center gap-4 border-b border-border bg-background px-6">
      <Sheet>
        <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-accent">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>
      <h2 className="text-base font-semibold">{title}</h2>
    </header>
  );
}
