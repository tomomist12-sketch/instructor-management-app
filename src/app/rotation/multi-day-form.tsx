"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategoryInfo } from "@/lib/categories";
import { Play, Trash2 } from "lucide-react";

type Instructor = { id: string; name: string };
type Setting = {
  id: string;
  category: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  startDate: string;
  weeksToGenerate: number;
};

type DaySchedule = {
  enabled: boolean;
  startTime: string;
  endTime: string;
  existingId?: string;
};

const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

type Props = {
  category: string;
  categoryLabel: string;
  instructors: Instructor[];
  existingSettings: Setting[];
  defaultStartTime: string;
  defaultEndTime: string;
};

export function MultiDayForm({ category, categoryLabel, instructors, existingSettings, defaultStartTime, defaultEndTime }: Props) {
  const cat = getCategoryInfo(category);

  // 曜日ごとのスケジュールを初期化
  const initDays: DaySchedule[] = Array.from({ length: 7 }, (_, dow) => {
    const existing = existingSettings.find((s) => s.dayOfWeek === dow);
    return {
      enabled: !!existing,
      startTime: existing?.startTime || defaultStartTime,
      endTime: existing?.endTime || defaultEndTime,
      existingId: existing?.id,
    };
  });

  const [days, setDays] = useState<DaySchedule[]>(initDays);
  const [startDate, setStartDate] = useState(existingSettings[0]?.startDate || new Date().toISOString().split("T")[0]);
  const [weeksToGenerate, setWeeksToGenerate] = useState(existingSettings[0]?.weeksToGenerate || 12);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function updateDay(dow: number, field: Partial<DaySchedule>) {
    const next = [...days];
    next[dow] = { ...next[dow], ...field };
    setDays(next);
  }

  async function handleSave() {
    setLoading(true); setMessage(null);
    try {
      const res = await fetch("/api/rotation/multi-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, days, startDate, weeksToGenerate }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "保存失敗");
      setMessage({ type: "success", text: "設定を保存しました" });
      // reload to get new IDs
      window.location.reload();
    } catch (e) {
      setMessage({ type: "error", text: "保存失敗: " + (e instanceof Error ? e.message : "") });
    } finally { setLoading(false); }
  }

  async function handleGenerate() {
    const hasEnabled = days.some((d) => d.enabled);
    if (!hasEnabled) { setMessage({ type: "error", text: "曜日を1つ以上選択してください" }); return; }
    if (instructors.length === 0) { setMessage({ type: "error", text: "講師が登録されていません" }); return; }
    setGenerating(true); setMessage(null);
    try {
      const res = await fetch("/api/rotation/multi-day-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, defaultInstructorId: instructors[0].id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "生成失敗");
      setMessage({ type: "success", text: `${data.count}件の${categoryLabel}予定を生成しました。担当者はシフト表から手動で変更してください。` });
    } catch (e) {
      setMessage({ type: "error", text: "生成失敗: " + (e instanceof Error ? e.message : "") });
    } finally { setGenerating(false); }
  }

  async function handleDeleteAll() {
    if (!confirm(`${categoryLabel}の全設定と生成済み予定を削除しますか？`)) return;
    try {
      await fetch("/api/rotation/multi-day", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      window.location.reload();
    } catch {}
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.color}`}>{categoryLabel}</span>
          <CardTitle className="text-base">曜日別スケジュール</CardTitle>
          <span className="text-xs text-muted-foreground ml-auto">※ 担当者はシフト表から手動で選択</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div className={`rounded-md p-2 text-sm ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {message.text}
          </div>
        )}

        {/* 曜日ごとの設定 */}
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
            <div key={dow} className="flex items-center gap-2">
              <label className="flex items-center gap-2 w-16">
                <input
                  type="checkbox"
                  checked={days[dow].enabled}
                  onChange={(e) => updateDay(dow, { enabled: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <span className={`text-sm font-medium ${dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : ""}`}>
                  {dayNames[dow]}
                </span>
              </label>
              {days[dow].enabled && (
                <>
                  <Input type="time" value={days[dow].startTime} onChange={(e) => updateDay(dow, { startTime: e.target.value })} className="w-28 h-8 text-sm" />
                  <span className="text-xs text-muted-foreground">〜</span>
                  <Input type="time" value={days[dow].endTime} onChange={(e) => updateDay(dow, { endTime: e.target.value })} className="w-28 h-8 text-sm" />
                </>
              )}
            </div>
          ))}
        </div>

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
          <Button onClick={handleSave} disabled={loading} className="flex-1">{loading ? "保存中..." : "設定を保存"}</Button>
          <Button onClick={handleGenerate} disabled={generating} variant="outline" className="flex-1">
            <Play className="h-4 w-4 mr-1" />{generating ? "生成中..." : "予定を生成"}
          </Button>
          {existingSettings.length > 0 && (
            <Button onClick={handleDeleteAll} variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
