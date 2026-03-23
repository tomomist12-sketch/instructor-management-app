"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategoryInfo } from "@/lib/categories";
import { saveFixedDaySetting, generateFixedDaySchedules, deleteRotationSetting } from "@/app/actions/rotation";
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

const dayNames = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

type Props = {
  category: string;
  categoryLabel: string;
  instructors: Instructor[];
  existing: Setting | null;
  defaultStartTime: string;
  defaultEndTime: string;
};

export function FixedDayForm({ category, categoryLabel, instructors, existing, defaultStartTime, defaultEndTime }: Props) {
  const cat = getCategoryInfo(category);

  const [dayOfWeek, setDayOfWeek] = useState(existing?.dayOfWeek ?? 0);
  const [startTime, setStartTime] = useState(existing?.startTime ?? defaultStartTime);
  const [endTime, setEndTime] = useState(existing?.endTime ?? defaultEndTime);
  const [startDate, setStartDate] = useState(existing?.startDate ?? new Date().toISOString().split("T")[0]);
  const [weeksToGenerate, setWeeksToGenerate] = useState(existing?.weeksToGenerate ?? 12);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave() {
    setLoading(true); setMessage(null);
    try {
      await saveFixedDaySetting({ id: existing?.id, category, dayOfWeek, startTime, endTime, startDate, weeksToGenerate });
      setMessage({ type: "success", text: "設定を保存しました" });
    } catch (e) { setMessage({ type: "error", text: "保存失敗" }); }
    finally { setLoading(false); }
  }

  async function handleGenerate() {
    if (!existing?.id) { setMessage({ type: "error", text: "先に設定を保存してください" }); return; }
    if (instructors.length === 0) { setMessage({ type: "error", text: "講師が登録されていません" }); return; }
    setGenerating(true); setMessage(null);
    try {
      const r = await generateFixedDaySchedules(existing.id, instructors[0].id);
      setMessage({ type: "success", text: `${r.count}件の${categoryLabel}予定を生成しました。担当者はシフト表のドロップダウンから個別に変更してください。` });
    } catch (e) { setMessage({ type: "error", text: "生成失敗: " + (e instanceof Error ? e.message : "") }); }
    finally { setGenerating(false); }
  }

  async function handleDelete() {
    if (!existing?.id) return;
    if (!confirm(`${categoryLabel}の設定と生成済み予定を削除しますか？`)) return;
    await deleteRotationSetting(existing.id);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.color}`}>{categoryLabel}</span>
          <CardTitle className="text-base">固定曜日設定</CardTitle>
          <span className="text-xs text-muted-foreground ml-auto">※ 担当者はシフト表から手動で選択</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div className={`rounded-md p-2 text-sm ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {message.text}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>実施曜日</Label>
            <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
              {dayNames.map((n, i) => (<option key={i} value={i}>{n}</option>))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>生成する週数</Label>
            <Input type="number" min={1} max={52} value={weeksToGenerate} onChange={(e) => setWeeksToGenerate(Number(e.target.value))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>開始時間</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
          <div className="space-y-2"><Label>終了時間</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
        </div>
        <div className="space-y-2">
          <Label>開始日</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={loading} className="flex-1">{loading ? "保存中..." : "設定を保存"}</Button>
          <Button onClick={handleGenerate} disabled={generating || !existing?.id} variant="outline" className="flex-1">
            <Play className="h-4 w-4 mr-1" />{generating ? "生成中..." : "予定を生成"}
          </Button>
          {existing?.id && (
            <Button onClick={handleDelete} variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
