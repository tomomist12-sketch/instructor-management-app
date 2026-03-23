"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveRotationSetting, deleteRotationSetting, generateRotationSchedules } from "@/app/actions/rotation";
import { Trash2, Play, GripVertical } from "lucide-react";
import { getCategoryInfo } from "@/lib/categories";

type Instructor = { id: string; name: string };
type Setting = {
  id: string;
  category: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  instructorOrder: string;
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
  showTime: boolean;
  note?: string;
};

export function RotationForm({ category, categoryLabel, instructors, existing, defaultStartTime, defaultEndTime, showTime, note }: Props) {
  const [dayOfWeek, setDayOfWeek] = useState(existing?.dayOfWeek ?? 0);
  const [startTime, setStartTime] = useState(existing?.startTime ?? defaultStartTime);
  const [endTime, setEndTime] = useState(existing?.endTime ?? defaultEndTime);
  const [startDate, setStartDate] = useState(existing?.startDate ?? new Date().toISOString().split("T")[0]);
  const [weeksToGenerate, setWeeksToGenerate] = useState(existing?.weeksToGenerate ?? 12);
  const [order, setOrder] = useState<string[]>(
    existing?.instructorOrder ? existing.instructorOrder.split(",") : instructors.map((i) => i.id)
  );
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const catInfo = getCategoryInfo(category);

  function moveUp(i: number) { if (i === 0) return; const n = [...order]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setOrder(n); }
  function moveDown(i: number) { if (i === order.length - 1) return; const n = [...order]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; setOrder(n); }
  function toggle(id: string) { order.includes(id) ? setOrder(order.filter((x) => x !== id)) : setOrder([...order, id]); }

  async function handleSave() {
    if (order.length === 0) { setMessage({ type: "error", text: "講師を1名以上選択してください" }); return; }
    setLoading(true); setMessage(null);
    try {
      await saveRotationSetting({ id: existing?.id, category, dayOfWeek, startTime, endTime, instructorOrder: order, startDate, weeksToGenerate });
      setMessage({ type: "success", text: "設定を保存しました" });
    } catch (e) { setMessage({ type: "error", text: "保存失敗: " + (e instanceof Error ? e.message : "") }); }
    finally { setLoading(false); }
  }

  async function handleGenerate() {
    if (!existing?.id) { setMessage({ type: "error", text: "先に設定を保存してください" }); return; }
    setGenerating(true); setMessage(null);
    try {
      const r = await generateRotationSchedules(existing.id);
      setMessage({ type: "success", text: `${r.count}件の${categoryLabel}予定を生成しました` });
    } catch (e) { setMessage({ type: "error", text: "生成失敗: " + (e instanceof Error ? e.message : "") }); }
    finally { setGenerating(false); }
  }

  async function handleDelete() {
    if (!existing?.id) return;
    if (!confirm(`${categoryLabel}のローテーション設定と生成済み予定を削除しますか？`)) return;
    await deleteRotationSetting(existing.id);
  }

  // プレビュー
  const previewWeeks = Math.min(weeksToGenerate, 6);
  const preview: { date: string; instructor: string }[] = [];
  if (order.length > 0) {
    const start = new Date(startDate);
    let cur = new Date(start);
    while (cur.getDay() !== dayOfWeek) cur.setDate(cur.getDate() + 1);
    for (let i = 0; i < previewWeeks; i++) {
      const d = new Date(cur); d.setDate(cur.getDate() + i * 7);
      const inst = instructors.find((x) => x.id === order[i % order.length]);
      preview.push({ date: d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", weekday: "short" }), instructor: inst?.name || "?" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${catInfo.color}`}>{categoryLabel}</span>
          <CardTitle className="text-base">ローテーション設定</CardTitle>
        </div>
        {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
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
        {showTime && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>開始時間</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
            <div className="space-y-2"><Label>終了時間</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
          </div>
        )}
        <div className="space-y-2">
          <Label>開始日</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        {/* 担当順 */}
        <div className="space-y-2">
          <Label>担当順（上から順にローテーション）</Label>
          <div className="space-y-1">
            {order.map((id, idx) => {
              const inst = instructors.find((x) => x.id === id);
              if (!inst) return null;
              return (
                <div key={id} className="flex items-center gap-2 rounded-md border p-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium flex-1">{idx + 1}. {inst.name}</span>
                  <button onClick={() => moveUp(idx)} disabled={idx === 0} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">↑</button>
                  <button onClick={() => moveDown(idx)} disabled={idx === order.length - 1} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">↓</button>
                  <button onClick={() => toggle(id)} className="text-xs text-destructive">除外</button>
                </div>
              );
            })}
          </div>
          {instructors.filter((i) => !order.includes(i.id)).length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {instructors.filter((i) => !order.includes(i.id)).map((i) => (
                <button key={i.id} onClick={() => toggle(i.id)} className="rounded-md border px-2 py-1 text-xs hover:bg-accent">+ {i.name}</button>
              ))}
            </div>
          )}
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

        {/* プレビュー */}
        {preview.length > 0 && (
          <div className="space-y-1 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground">プレビュー</p>
            {preview.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm rounded-md border p-1.5 px-2">
                <span className="text-muted-foreground">{p.date}</span>
                <span className="font-medium">{p.instructor}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
