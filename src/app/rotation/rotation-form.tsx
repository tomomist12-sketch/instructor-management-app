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
  extraDaysOfWeek: string | null;
  rotationMode: string;
  startTime: string;
  endTime: string;
  instructorOrder: string;
  startDate: string;
  weeksToGenerate: number;
};

const dayNames = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
const dayShort = ["日", "月", "火", "水", "木", "金", "土"];

type InstructorTime = { id: string; startTime: string; endTime: string };

// instructorOrder形式: "id1|20:00|21:30,id2|19:00|20:30" or "id1,id2"（時間なし）
function parseOrder(orderStr: string): InstructorTime[] {
  if (!orderStr) return [];
  return orderStr.split(",").map((entry) => {
    const parts = entry.split("|");
    if (parts.length >= 3) {
      return { id: parts[0], startTime: parts[1], endTime: parts[2] };
    }
    // 旧形式（UUID:HH:MM-HH:MM）のフォールバック
    if (entry.length > 36 && entry[36] === ":") {
      const id = entry.substring(0, 36);
      const timePart = entry.substring(37);
      const [s, e] = timePart.split("-");
      if (s && e) return { id, startTime: s, endTime: e };
    }
    return { id: entry, startTime: "", endTime: "" };
  });
}

function serializeOrder(items: InstructorTime[], perInstructorTime: boolean): string[] {
  if (perInstructorTime) {
    return items.map((i) => `${i.id}|${i.startTime || "00:00"}|${i.endTime || "00:00"}`);
  }
  return items.map((i) => i.id);
}

type Props = {
  category: string;
  categoryLabel: string;
  instructors: Instructor[];
  existing: Setting | null;
  defaultStartTime: string;
  defaultEndTime: string;
  showTime: boolean;
  perInstructorTime?: boolean; // 講師ごとに時間が違うモード
  note?: string;
};

export function RotationForm({ category, categoryLabel, instructors, existing, defaultStartTime, defaultEndTime, showTime, perInstructorTime = false, note }: Props) {
  const initialDays = (() => {
    if (!existing) return [0];
    const extras = (existing.extraDaysOfWeek ?? "")
      .split(",")
      .map((s) => Number(s))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    return [...new Set([existing.dayOfWeek, ...extras])].sort((a, b) => a - b);
  })();
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initialDays);
  const initialMode: "continuous" | "perDay" | "perDayFixed" =
    existing?.rotationMode === "perDay"
      ? "perDay"
      : existing?.rotationMode === "perDayFixed"
        ? "perDayFixed"
        : "continuous";
  const [rotationMode, setRotationMode] = useState<"continuous" | "perDay" | "perDayFixed">(initialMode);
  const [startTime, setStartTime] = useState(existing?.startTime ?? defaultStartTime);
  const [endTime, setEndTime] = useState(existing?.endTime ?? defaultEndTime);
  const [startDate, setStartDate] = useState(existing?.startDate ?? new Date().toISOString().split("T")[0]);
  const [weeksToGenerate, setWeeksToGenerate] = useState(existing?.weeksToGenerate ?? 12);

  function toggleDay(dow: number) {
    setDaysOfWeek((prev) => {
      if (prev.includes(dow)) {
        if (prev.length === 1) return prev; // 最後の1つは外させない
        // 担当割当からも削除
        setDayAssignments((m) => {
          const n = { ...m };
          delete n[dow];
          return n;
        });
        return prev.filter((d) => d !== dow);
      }
      // 追加曜日には先頭講師をデフォルト割当
      setDayAssignments((m) => {
        if (m[dow]) return m;
        const fallback = instructors[0]?.id;
        return fallback ? { ...m, [dow]: fallback } : m;
      });
      return [...prev, dow].sort((a, b) => a - b);
    });
  }

  const parsed = existing?.instructorOrder ? parseOrder(existing.instructorOrder) : instructors.map((i) => ({ id: i.id, startTime: defaultStartTime, endTime: defaultEndTime }));
  const [order, setOrder] = useState<InstructorTime[]>(parsed);

  // 曜日ごとに固定担当（perDayFixed）モード用: 曜日 → 講師ID
  const initialDayAssignments = (() => {
    const map: Record<number, string> = {};
    const sortedInit = [...initialDays].sort((a, b) => a - b);
    if (existing?.rotationMode === "perDayFixed" && parsed.length > 0) {
      sortedInit.forEach((dow, i) => {
        const item = parsed[i] ?? parsed[parsed.length - 1];
        if (item) map[dow] = item.id;
      });
    } else {
      const fallback = instructors[0]?.id;
      if (fallback) sortedInit.forEach((dow) => { map[dow] = fallback; });
    }
    return map;
  })();
  const [dayAssignments, setDayAssignments] = useState<Record<number, string>>(initialDayAssignments);

  function setDayInstructor(dow: number, instructorId: string) {
    setDayAssignments((prev) => ({ ...prev, [dow]: instructorId }));
  }

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const catInfo = getCategoryInfo(category);

  function moveUp(i: number) { if (i === 0) return; const n = [...order]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setOrder(n); }
  function moveDown(i: number) { if (i === order.length - 1) return; const n = [...order]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; setOrder(n); }
  function toggleInstructor(id: string) {
    if (order.find((o) => o.id === id)) {
      setOrder(order.filter((o) => o.id !== id));
    } else {
      setOrder([...order, { id, startTime: defaultStartTime, endTime: defaultEndTime }]);
    }
  }
  function updateTime(idx: number, field: "startTime" | "endTime", value: string) {
    const n = [...order];
    n[idx] = { ...n[idx], [field]: value };
    setOrder(n);
  }

  async function handleSave() {
    if (daysOfWeek.length === 0) { setMessage({ type: "error", text: "実施曜日を1つ以上選択してください" }); return; }
    setLoading(true); setMessage(null);
    try {
      let serialized: string[];
      if (rotationMode === "perDayFixed") {
        const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
        const items: InstructorTime[] = sortedDays.map((dow) => {
          const id = dayAssignments[dow] ?? instructors[0]?.id;
          if (!id) throw new Error("各曜日に担当者を割り当ててください");
          return { id, startTime: defaultStartTime, endTime: defaultEndTime };
        });
        serialized = serializeOrder(items, perInstructorTime);
      } else {
        if (order.length === 0) { setMessage({ type: "error", text: "講師を1名以上選択してください" }); setLoading(false); return; }
        serialized = serializeOrder(order, perInstructorTime);
      }
      const r = await saveRotationSetting({ id: existing?.id, category, daysOfWeek, rotationMode, startTime, endTime, instructorOrder: serialized, startDate, weeksToGenerate });
      setMessage({ type: "success", text: `設定を保存し、${r.count}件の予定を生成しました` });
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

  // プレビュー（実施スロットを日付順に並べる）
  const PREVIEW_LIMIT = 6;
  const preview: { date: string; instructor: string; time: string }[] = [];
  const hasPool = rotationMode === "perDayFixed" ? Object.keys(dayAssignments).length > 0 : order.length > 0;
  if (hasPool && daysOfWeek.length > 0) {
    const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
    const slots: { date: Date; instructorId: string; item?: InstructorTime }[] = [];
    const start = new Date(startDate);
    for (let week = 0; week < weeksToGenerate && slots.length < PREVIEW_LIMIT; week++) {
      for (let di = 0; di < sortedDays.length; di++) {
        const dow = sortedDays[di];
        const d = new Date(start);
        const diff = (dow - d.getDay() + 7) % 7;
        d.setDate(start.getDate() + diff + week * 7);
        let instructorId = "";
        let item: InstructorTime | undefined;
        if (rotationMode === "perDayFixed") {
          instructorId = dayAssignments[dow] ?? "";
        } else {
          const idx =
            rotationMode === "perDay"
              ? week % order.length
              : (week * sortedDays.length + di) % order.length;
          item = order[idx];
          instructorId = item?.id ?? "";
        }
        slots.push({ date: d, instructorId, item });
        if (slots.length >= PREVIEW_LIMIT) break;
      }
    }
    for (const s of slots) {
      const inst = instructors.find((x) => x.id === s.instructorId);
      const time = perInstructorTime && s.item
        ? `${s.item.startTime}〜${s.item.endTime}`
        : (showTime ? `${startTime}〜${endTime}` : "");
      preview.push({
        date: s.date.toLocaleDateString("ja-JP", { month: "short", day: "numeric", weekday: "short" }),
        instructor: inst?.name || "?",
        time,
      });
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
        <div className="space-y-2">
          <Label>実施曜日（複数選択可）</Label>
          <div className="flex flex-wrap gap-1">
            {dayShort.map((label, i) => {
              const active = daysOfWeek.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`h-9 w-10 rounded-md border text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent hover:bg-accent"
                  } ${i === 0 && !active ? "text-red-500" : ""} ${i === 6 && !active ? "text-blue-500" : ""}`}
                  aria-pressed={active}
                  aria-label={dayNames[i]}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>ローテーションモード</Label>
            <select
              value={rotationMode}
              onChange={(e) => {
                const v = e.target.value;
                setRotationMode(v === "perDay" ? "perDay" : v === "perDayFixed" ? "perDayFixed" : "continuous");
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="continuous">全曜日を跨いで連続ローテ</option>
              <option value="perDay">曜日ごとに独立ローテ</option>
              <option value="perDayFixed">曜日ごとに固定担当（ローテなし）</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>生成する週数</Label>
            <Input type="number" min={1} max={52} value={weeksToGenerate} onChange={(e) => setWeeksToGenerate(Number(e.target.value))} />
          </div>
        </div>
        {showTime && !perInstructorTime && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>開始時間</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
            <div className="space-y-2"><Label>終了時間</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
          </div>
        )}
        <div className="space-y-2">
          <Label>開始日</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        {/* 担当 */}
        {rotationMode === "perDayFixed" ? (
          <div className="space-y-2">
            <Label>曜日ごとの担当（毎週固定）</Label>
            <div className="space-y-1">
              {[...daysOfWeek].sort((a, b) => a - b).map((dow) => (
                <div key={dow} className="flex items-center gap-2 rounded-md border p-2">
                  <span className={`text-sm font-medium w-12 shrink-0 ${dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : ""}`}>
                    {dayShort[dow]}曜日
                  </span>
                  <select
                    value={dayAssignments[dow] ?? ""}
                    onChange={(e) => setDayInstructor(dow, e.target.value)}
                    className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="" disabled>担当者を選択</option>
                    {instructors.map((inst) => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ) : (
        <div className="space-y-2">
          <Label>担当順（上から順にローテーション）</Label>
          <div className="space-y-1">
            {order.map((item, idx) => {
              const inst = instructors.find((x) => x.id === item.id);
              if (!inst) return null;
              return (
                <div key={item.id} className="flex items-center gap-2 rounded-md border p-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium w-20 shrink-0">{idx + 1}. {inst.name}</span>
                  {perInstructorTime && (
                    <>
                      <Input type="time" value={item.startTime} onChange={(e) => updateTime(idx, "startTime", e.target.value)} className="w-24 h-8 text-xs" />
                      <span className="text-xs text-muted-foreground">〜</span>
                      <Input type="time" value={item.endTime} onChange={(e) => updateTime(idx, "endTime", e.target.value)} className="w-24 h-8 text-xs" />
                    </>
                  )}
                  <div className="flex gap-1 ml-auto shrink-0">
                    <button onClick={() => moveUp(idx)} disabled={idx === 0} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">↑</button>
                    <button onClick={() => moveDown(idx)} disabled={idx === order.length - 1} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">↓</button>
                    <button onClick={() => toggleInstructor(item.id)} className="text-xs text-destructive">除外</button>
                  </div>
                </div>
              );
            })}
          </div>
          {instructors.filter((i) => !order.find((o) => o.id === i.id)).length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {instructors.filter((i) => !order.find((o) => o.id === i.id)).map((i) => (
                <button key={i.id} onClick={() => toggleInstructor(i.id)} className="rounded-md border px-2 py-1 text-xs hover:bg-accent">+ {i.name}</button>
              ))}
            </div>
          )}
        </div>
        )}

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
                {p.time && <span className="text-xs text-muted-foreground">{p.time}</span>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
