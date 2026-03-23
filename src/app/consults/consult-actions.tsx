"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteSchedule, notifySchedule } from "@/app/actions/schedules";
import { Trash2, Send } from "lucide-react";

export function ConsultActions({ consultId }: { consultId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleNotify() {
    setLoading(true);
    try {
      await notifySchedule(consultId);
      alert("LINEに通知しました");
    } catch (e) {
      alert(e instanceof Error ? e.message : "通知失敗");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("削除しますか？")) return;
    setLoading(true);
    try {
      await deleteSchedule(consultId);
    } catch {
      alert("削除失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-1">
      <Button size="sm" variant="ghost" onClick={handleNotify} disabled={loading} className="h-7 w-7 p-0 text-blue-600">
        <Send className="h-3 w-3" />
      </Button>
      <Button size="sm" variant="ghost" onClick={handleDelete} disabled={loading} className="h-7 w-7 p-0 text-destructive">
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
