"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCategoryInfo } from "@/lib/categories";
import { saveLineReplySettings, generateLineReplySchedules } from "@/app/actions/rotation";
import { Play } from "lucide-react";

type Instructor = { id: string; name: string };
type Setting = { id: string; dayOfWeek: number; instructorOrder: string };

const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

export function LineReplyForm({ instructors, settings }: { instructors: Instructor[]; settings: Setting[] }) {
  const cat = getCategoryInfo("line_reply");

  // 曜日ごとの担当を初期化
  const initial: Record<number, string> = {};
  for (const s of settings) initial[s.dayOfWeek] = s.instructorOrder;

  const [assignments, setAssignments] = useState<Record<number, string>>(initial);
  const [weeks, setWeeks] = useState(12);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function setDay(dow: number, instructorId: string) {
    setAssignments({ ...assignments, [dow]: instructorId });
  }

  async function handleSave() {
    setLoading(true); setMessage(null);
    try {
      const data = Object.entries(assignments)
        .filter(([, id]) => id)
        .map(([dow, id]) => ({ dayOfWeek: Number(dow), instructorId: id }));
      await saveLineReplySettings(data);
      setMessage({ type: "success", text: "保存しました" });
    } catch (e) {
      setMessage({ type: "error", text: "保存失敗: " + (e instanceof Error ? e.message : "") });
    } finally { setLoading(false); }
  }

  async function handleGenerate() {
    setGenerating(true); setMessage(null);
    try {
      const r = await generateLineReplySchedules(weeks);
      setMessage({ type: "success", text: `${r.count}件のライン返信予定を生成しました` });
    } catch (e) {
      setMessage({ type: "error", text: "生成失敗: " + (e instanceof Error ? e.message : "") });
    } finally { setGenerating(false); }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.color}`}>ライン返信</span>
          <CardTitle className="text-base">曜日ごとの固定担当</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div className={`rounded-md p-2 text-sm ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {message.text}
          </div>
        )}

        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
            <div key={dow} className="flex items-center gap-3">
              <span className={`w-8 text-sm font-medium text-center ${dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : ""}`}>
                {dayNames[dow]}
              </span>
              <select
                value={assignments[dow] || ""}
                onChange={(e) => setDay(dow, e.target.value)}
                className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">担当なし</option>
                {instructors.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs whitespace-nowrap">生成する週数</Label>
          <Input type="number" min={1} max={52} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="w-20 h-9" />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={loading} className="flex-1">{loading ? "保存中..." : "設定を保存"}</Button>
          <Button onClick={handleGenerate} disabled={generating} variant="outline" className="flex-1">
            <Play className="h-4 w-4 mr-1" />{generating ? "生成中..." : "予定を生成"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
