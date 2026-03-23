"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategoryInfo } from "@/lib/categories";
import { Play, Trash2 } from "lucide-react";

type Setting = {
  id: string;
  startDate: string;
  weeksToGenerate: number;
};

type Props = {
  instructors: { id: string; name: string }[];
  existing: Setting | null;
};

export function LiveTalkForm({ instructors, existing }: Props) {
  const cat = getCategoryInfo("live_talk");

  const [startDate, setStartDate] = useState(existing?.startDate || new Date().toISOString().split("T")[0]);
  const [weeksToGenerate, setWeeksToGenerate] = useState(existing?.weeksToGenerate || 12);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave() {
    setLoading(true); setMessage(null);
    try {
      const res = await fetch("/api/rotation/multi-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "live_talk",
          days: Array.from({ length: 7 }, (_, i) => ({
            enabled: i === 6, // 土曜のみ
            startTime: "20:00",
            endTime: "21:30",
          })),
          startDate,
          weeksToGenerate,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setMessage({ type: "success", text: "設定を保存しました" });
    } catch (e) {
      setMessage({ type: "error", text: "保存失敗: " + (e instanceof Error ? e.message : "") });
    } finally { setLoading(false); }
  }

  async function handleGenerate() {
    if (instructors.length === 0) { setMessage({ type: "error", text: "講師が登録されていません" }); return; }
    setGenerating(true); setMessage(null);
    try {
      // まず保存
      await fetch("/api/rotation/multi-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "live_talk",
          days: Array.from({ length: 7 }, (_, i) => ({
            enabled: i === 6,
            startTime: "20:00",
            endTime: "21:30",
          })),
          startDate,
          weeksToGenerate,
        }),
      });
      // 生成
      const res = await fetch("/api/rotation/multi-day-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "live_talk", defaultInstructorId: instructors[0].id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setMessage({ type: "success", text: `${data.count}件のライブトーク予定を毎週土曜に生成しました。担当者と時間はシフト表のバッジをクリックして編集してください。` });
    } catch (e) {
      setMessage({ type: "error", text: "生成失敗: " + (e instanceof Error ? e.message : "") });
    } finally { setGenerating(false); }
  }

  async function handleDelete() {
    if (!confirm("ライブトークの設定と生成済み予定を全て削除しますか？")) return;
    await fetch("/api/rotation/multi-day", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "live_talk" }),
    });
    window.location.reload();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.color}`}>ライブトーク</span>
          <CardTitle className="text-base">毎週土曜 一括生成</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          毎週土曜にライブトークのバッジを自動生成します。<br />
          時間と担当者は毎回異なるため、シフト表のバッジをクリックして個別に編集してください。
        </p>

        {message && (
          <div className={`rounded-md p-2 text-sm ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>開始日</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>生成する週数</Label>
            <Input type="number" min={1} max={52} value={weeksToGenerate} onChange={(e) => setWeeksToGenerate(Number(e.target.value))} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={generating} className="flex-1">
            <Play className="h-4 w-4 mr-1" />{generating ? "生成中..." : "毎週土曜の予定を生成"}
          </Button>
          {existing && (
            <Button onClick={handleDelete} variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
