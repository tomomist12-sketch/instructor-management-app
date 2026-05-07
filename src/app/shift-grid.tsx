"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getCategoryInfo, CATEGORY_OPTIONS } from "@/lib/categories";
import { createSchedule, deleteSchedule, deleteRecurrenceGroup, deleteRecurrenceFromDate, notifySchedule, updateSchedule } from "@/app/actions/schedules";
import { SimpleModal } from "@/components/simple-modal";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, Pencil, Trash2, Send, Repeat, X } from "lucide-react";

type Schedule = {
  id: string;
  category: string;
  title: string | null;
  instructorId: string;
  participantName: string | null;
  scheduledAt: string;
  endAt: string | null;
  memo: string | null;
  status: string;
  isRecurring: boolean;
  recurrenceRule: string | null;
  recurrenceGroupId: string | null;
  instructorName: string;
};

type Props = {
  instructors: { id: string; name: string }[];
  schedules: Schedule[];
};

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

type ViewMode = "week" | "2weeks" | "month";

function getGridDates(baseDate: Date, view: ViewMode): Date[] {
  const dates: Date[] = [];
  if (view === "month") {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(year, month, i));
    }
  } else {
    const count = view === "week" ? 7 : 14;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - ((baseDate.getDay() + 6) % 7));
    for (let i = 0; i < count; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
  }
  return dates;
}

const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

// セル内ドロップダウン
function CellDropdown({
  dateKey,
  instructorId,
  items,
  onAdd,
  onDelete,
  onNotify,
  onEdit,
  onDrop,
}: {
  dateKey: string;
  instructorId: string;
  items: Schedule[];
  onAdd: (dateKey: string, instructorId: string, category: string) => void;
  onDelete: (id: string) => void;
  onNotify: (id: string) => void;
  onEdit: (s: Schedule) => void;
  onDrop: (scheduleId: string, newDateKey: string, newInstructorId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const [dragOver, setDragOver] = useState(false);
  const [customInput, setCustomInput] = useState(false);
  const [customText, setCustomText] = useState("");

  return (
    <div
      ref={ref}
      className={`relative min-h-[44px] rounded-md transition-colors ${dragOver ? "bg-primary/10 ring-2 ring-primary/30 ring-inset" : "hover:bg-accent/25"}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const scheduleId = e.dataTransfer.getData("scheduleId");
        if (scheduleId) onDrop(scheduleId, dateKey, instructorId);
      }}
    >
      {/* バッジ表示 */}
      <div className="space-y-1">
        {items.map((s) => {
          const cat = getCategoryInfo(s.category);
          return (
            <div key={s.id} className="group flex items-center gap-1">
              <button
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("scheduleId", s.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={(e) => { e.stopPropagation(); onEdit(s); }}
                className={`flex-1 rounded-md px-2 py-1 text-xs sm:text-sm font-semibold truncate ${cat.color} flex items-center gap-1 text-left shadow-sm transition-all hover:-translate-y-px hover:shadow cursor-grab active:cursor-grabbing`}
                title={(() => {
                  const d = new Date(s.scheduledAt);
                  const isAllDay = d.getHours() === 0 && d.getMinutes() === 0 && !s.endAt;
                  if (isAllDay) return `${cat.label}\n終日\nドラッグで移動 / クリックで編集`;
                  const start = d.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
                  const end = s.endAt ? `〜${new Date(s.endAt).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" })}` : "";
                  return `${cat.label}\n${start}${end}\nドラッグで移動 / クリックで編集`;
                })()}
              >
                {s.isRecurring && <Repeat className="h-2.5 w-2.5 shrink-0" />}
                {s.category === "custom" && s.title ? s.title : cat.label}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onNotify(s.id); }}
                className="hidden h-5 w-5 items-center justify-center rounded-md bg-sky-50 text-sky-500 hover:bg-sky-100 hover:text-sky-700 group-hover:inline-flex"
                title="LINE通知"
              >
                <Send className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                className="hidden h-5 w-5 items-center justify-center rounded-md bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 group-hover:inline-flex"
                title="削除"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ▼ ドロップダウントリガー */}
      <button
        onClick={() => setOpen(!open)}
        className="absolute right-0 top-0 rounded-md p-0.5 text-muted-foreground/45 hover:bg-background/80 hover:text-muted-foreground"
      >
        <ChevronDown className="h-3 w-3" />
      </button>

      {/* ドロップダウンメニュー */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-lg border border-border bg-popover p-1 shadow-lg">
          {CATEGORY_OPTIONS.map((opt) => {
            const cat = getCategoryInfo(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => {
                  onAdd(dateKey, instructorId, opt.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium hover:bg-accent"
              >
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${cat.dotColor}`} />
                {opt.label}
              </button>
            );
          })}
          <div className="my-1 border-t" />
          {customInput ? (
            <div className="px-2 py-1 space-y-1">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="予定名を入力"
                className="w-full rounded-md border border-input bg-background/90 px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customText.trim()) {
                    onAdd(dateKey, instructorId, `custom:${customText.trim()}`);
                    setCustomText("");
                    setCustomInput(false);
                    setOpen(false);
                  }
                  if (e.key === "Escape") { setCustomInput(false); setCustomText(""); }
                }}
              />
              <button
                onClick={() => {
                  if (customText.trim()) {
                    onAdd(dateKey, instructorId, `custom:${customText.trim()}`);
                    setCustomText("");
                    setCustomInput(false);
                    setOpen(false);
                  }
                }}
                className="w-full rounded-md bg-primary py-1 text-center text-xs text-primary-foreground hover:bg-primary/90"
              >
                追加
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCustomInput(true)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Pencil className="h-3 w-3" />
              自由入力...
            </button>
          )}
          {items.length > 0 && (
            <>
              <div className="my-1 border-t" />
              <button
                onClick={() => {
                  items.forEach((s) => onDelete(s.id));
                  setOpen(false);
                }}
                className="w-full rounded-md px-2 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10"
              >
                全てクリア
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ShiftGrid({ instructors, schedules }: Props) {
  const [baseDate, setBaseDate] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<Schedule | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editInstructor, setEditInstructor] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editAllDay, setEditAllDay] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const dates = useMemo(() => getGridDates(baseDate, view), [baseDate, view]);

  useEffect(() => {
    if (window.innerWidth < 768) setView("week");
  }, []);

  const scheduleMap = useMemo(() => {
    const map: Record<string, Schedule[]> = {};
    for (const s of schedules) {
      const key = `${toDateKey(new Date(s.scheduledAt))}_${s.instructorId}`;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [schedules]);

  async function handleAdd(dateKey: string, instructorId: string, category: string) {
    setSaving(true);
    try {
      const fd = new FormData();
      // "custom:テキスト" 形式の場合はカスタム予定として処理
      if (category.startsWith("custom:")) {
        const customTitle = category.substring(7);
        fd.set("category", "custom");
        fd.set("title", customTitle);
      } else {
        fd.set("category", category);
        fd.set("title", "");
      }
      fd.set("instructorId", instructorId);
      fd.set("participantName", "");
      fd.set("scheduledAt", `${dateKey}T10:00`);
      fd.set("endAt", "");
      fd.set("memo", "");
      fd.set("repeat", "none");
      fd.set("repeatCount", "1");
      await createSchedule(fd);
    } catch (e) {
      alert("保存失敗: " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSchedule(id);
    } catch {
      alert("削除失敗");
    }
  }

  async function handleNotify(id: string) {
    try {
      await notifySchedule(id);
      alert("LINEに通知しました");
    } catch (e) {
      alert(e instanceof Error ? e.message : "通知失敗");
    }
  }

  async function handleDrop(scheduleId: string, newDateKey: string, newInstructorId: string) {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("instructorId", newInstructorId);
      // 元の時刻を維持して日付だけ変更
      const original = schedules.find((s) => s.id === scheduleId);
      if (original) {
        const oldDate = new Date(original.scheduledAt);
        const hours = oldDate.getHours().toString().padStart(2, "0");
        const mins = oldDate.getMinutes().toString().padStart(2, "0");
        fd.set("scheduledAt", `${newDateKey}T${hours}:${mins}`);
        if (original.endAt) {
          const oldEnd = new Date(original.endAt);
          const eH = oldEnd.getHours().toString().padStart(2, "0");
          const eM = oldEnd.getMinutes().toString().padStart(2, "0");
          fd.set("endAt", `${newDateKey}T${eH}:${eM}`);
        }
      } else {
        fd.set("scheduledAt", `${newDateKey}T10:00`);
      }
      await updateSchedule(scheduleId, fd);
    } catch (e) {
      alert("移動に失敗しました: " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  }

  function openEdit(s: Schedule) {
    setEditItem(s);
    const d = new Date(s.scheduledAt);
    const p = (n: number) => n.toString().padStart(2, "0");
    // ブラウザのローカルタイム（JST）で時刻取得
    const h = d.getHours();
    const m = d.getMinutes();
    const isAllDay = h === 0 && m === 0 && !s.endAt;
    setEditAllDay(isAllDay);
    setEditTime(isAllDay ? "" : `${p(h)}:${p(m)}`);
    if (s.endAt) {
      const e = new Date(s.endAt);
      setEditEndTime(`${p(e.getHours())}:${p(e.getMinutes())}`);
    } else {
      setEditEndTime("");
    }
    setEditInstructor(s.instructorId);
    setEditMemo(s.memo || "");
  }

  async function handleEditSave() {
    if (!editItem) return;
    setEditLoading(true);
    try {
      const dateKey = toDateKey(new Date(editItem.scheduledAt));
      const fd = new FormData();
      fd.set("instructorId", editInstructor);
      if (editAllDay) {
        fd.set("scheduledAt", `${dateKey}T00:00`);
      } else {
        fd.set("scheduledAt", `${dateKey}T${editTime || "10:00"}`);
        if (editEndTime) fd.set("endAt", `${dateKey}T${editEndTime}`);
        else fd.set("endAt", "");
      }
      fd.set("memo", editMemo);
      await updateSchedule(editItem.id, fd);
      setEditItem(null);
    } catch (e) {
      alert("保存失敗: " + (e instanceof Error ? e.message : ""));
    } finally {
      setEditLoading(false);
    }
  }

  const todayKey = toDateKey(new Date());

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-2.5 shadow-sm sm:p-3">
        {/* ナビ + ビュー切替 */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Button variant="outline" size="sm" className="bg-background font-medium shadow-sm hover:bg-accent" onClick={() => {
            const d = new Date(baseDate);
            if (view === "month") d.setMonth(d.getMonth() - 1);
            else if (view === "2weeks") d.setDate(d.getDate() - 14);
            else d.setDate(d.getDate() - 7);
            setBaseDate(d);
          }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="bg-background font-medium shadow-sm hover:bg-accent" onClick={() => setBaseDate(new Date())}>今日</Button>
          <Button variant="outline" size="sm" className="bg-background font-medium shadow-sm hover:bg-accent" onClick={() => {
            const d = new Date(baseDate);
            if (view === "month") d.setMonth(d.getMonth() + 1);
            else if (view === "2weeks") d.setDate(d.getDate() + 14);
            else d.setDate(d.getDate() + 7);
            setBaseDate(d);
          }}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <span className="ml-1 rounded-md bg-accent px-2 py-1 text-xs font-bold text-foreground sm:text-sm">
            {view === "month"
              ? dates[0].toLocaleDateString("ja-JP", { year: "numeric", month: "long" })
              : `${dates[0].toLocaleDateString("ja-JP", { month: "short", day: "numeric" })} 〜 ${dates[dates.length - 1].toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}`
            }
          </span>

          <div className="ml-auto flex gap-0.5 rounded-lg border border-border bg-background p-0.5 shadow-sm">
            {(["week", "2weeks", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors sm:px-3 ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
              >
                {v === "week" ? "週" : v === "2weeks" ? "2週" : "月"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {saving && <span className="text-xs font-medium text-muted-foreground">保存中...</span>}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setSaving(true);
              try {
                const res = await fetch("/api/cron/sync-calendar?manual=1");
                const data = await res.json();
                if (data.ok) {
                  alert(`Googleカレンダー同期完了：${data.created}件追加（${data.skipped}件スキップ）`);
                  window.location.reload();
                } else {
                  alert("同期エラー: " + (data.error || "不明"));
                }
              } catch {
                alert("同期に失敗しました");
              } finally {
                setSaving(false);
              }
            }}
            className="bg-background text-xs font-medium shadow-sm hover:bg-accent"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Gcal同期
          </Button>
        </div>
      </div>

      {/* グリッド */}
      <div className="max-h-[75vh] overflow-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className="border-b border-border bg-secondary">
              <th className="sticky left-0 z-30 w-14 border-r border-border bg-secondary p-1.5 text-left font-bold text-foreground sm:w-20 sm:p-2">日付</th>
              {instructors.map((inst) => (
                <th key={inst.id} className="min-w-[80px] border-r border-border bg-secondary p-1 text-center font-bold text-foreground last:border-r-0 sm:min-w-[130px] sm:p-2">
                  {inst.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((date) => {
              const dateKey = toDateKey(date);
              const dow = date.getDay();
              const isWeekend = dow === 0 || dow === 6;
              const isToday = dateKey === todayKey;

              return (
                <tr key={dateKey} className={`border-b border-border/30 transition-colors hover:bg-accent/40 ${isWeekend ? "bg-[#f7eee9]" : ""} ${isToday ? "bg-accent" : ""}`}>
                  <td className={`sticky left-0 z-10 border-r border-border p-1 sm:p-2 ${isWeekend ? "bg-[#f7eee9]" : isToday ? "bg-accent" : "bg-card"}`}>
                    <div className={`text-xs font-bold ${isToday ? "text-primary" : "text-foreground"}`}>{date.getMonth() + 1}/{date.getDate()}</div>
                    <div className={`text-xs font-medium ${dow === 0 ? "text-rose-500" : dow === 6 ? "text-sky-500" : "text-muted-foreground"}`}>
                      {dayNames[dow]}
                    </div>
                  </td>
                  {instructors.map((inst) => {
                    const key = `${dateKey}_${inst.id}`;
                    const items = scheduleMap[key] || [];
                    return (
                      <td key={inst.id} className="border-r border-border/20 p-1 align-top last:border-r-0">
                        <CellDropdown
                          dateKey={dateKey}
                          instructorId={inst.id}
                          items={items}
                          onAdd={handleAdd}
                          onDelete={handleDelete}
                          onNotify={handleNotify}
                          onEdit={openEdit}
                          onDrop={handleDrop}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-2 shadow-sm">
        {CATEGORY_OPTIONS.map((opt) => {
          const cat = getCategoryInfo(opt.value);
          return (
            <span key={opt.value} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${cat.color} shadow-sm`}>
              <span className={`h-2 w-2 rounded-full ${cat.dotColor}`} />
              {opt.label}
            </span>
          );
        })}
      </div>

      {/* 編集モーダル */}
      <SimpleModal open={!!editItem} onClose={() => setEditItem(null)} title="予定を編集">
        {editItem && (() => {
          const cat = getCategoryInfo(editItem.category);
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.color}`}>{cat.label}</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(editItem.scheduledAt).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
                </span>
                {editItem.participantName && (
                  <span className="text-sm font-medium ml-auto">{editItem.participantName}</span>
                )}
              </div>

              {/* メモ内容プレビュー（URLやメール等を見やすく表示） */}
              {editItem.memo && editItem.memo.includes("\n") && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap break-all leading-relaxed">
                  {editItem.memo.split("\n").filter(l => !l.startsWith("gcal:")).map((line, i) => {
                    // URLをリンク化
                    if (line.includes("http")) {
                      const urlMatch = line.match(/(https?:\/\/\S+)/);
                      if (urlMatch) {
                        const before = line.substring(0, line.indexOf(urlMatch[1]));
                        return (
                          <div key={i}>
                            {before}
                            <a href={urlMatch[1]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">
                              {urlMatch[1]}
                            </a>
                          </div>
                        );
                      }
                    }
                    return <div key={i}>{line}</div>;
                  })}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">担当講師</label>
                <select value={editInstructor} onChange={(e) => setEditInstructor(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                  {instructors.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editAllDay} onChange={(e) => { setEditAllDay(e.target.checked); if (e.target.checked) { setEditTime(""); setEditEndTime(""); } }} className="h-4 w-4 rounded" />
                <span className="text-sm font-medium">終日</span>
              </label>
              {!editAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">開始時間</label>
                    <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">終了時間</label>
                    <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
                  </div>
                </div>
              )}
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">メモを編集</summary>
                <textarea value={editMemo} onChange={(e) => setEditMemo(e.target.value)} rows={5} className="mt-2 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
              </details>
              <div className="flex gap-2">
                <Button onClick={handleEditSave} disabled={editLoading} className="flex-1">
                  {editLoading ? "保存中..." : "保存"}
                </Button>
                <Button variant="outline" onClick={() => handleNotify(editItem.id)} className="text-blue-600">
                  <Send className="h-4 w-4 mr-1" />LINE
                </Button>
              </div>

              {/* 削除オプション */}
              <div className="border-t pt-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">削除</p>
                <div className="flex flex-col gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={async () => {
                      if (!confirm("この予定だけ削除しますか？")) return;
                      await deleteSchedule(editItem.id);
                      setEditItem(null);
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-2" />この予定だけ削除
                  </Button>
                  {editItem.isRecurring && editItem.recurrenceGroupId && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs justify-start text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={async () => {
                          if (!confirm("この日以降の同じ繰り返し予定を全て削除しますか？")) return;
                          await deleteRecurrenceFromDate(editItem.recurrenceGroupId!, editItem.scheduledAt);
                          setEditItem(null);
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />これ以降の予定を全て削除
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs justify-start text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={async () => {
                          if (!confirm("この繰り返し予定を全て（過去分も含めて）削除しますか？")) return;
                          await deleteRecurrenceGroup(editItem.recurrenceGroupId!);
                          setEditItem(null);
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />全ての繰り返し予定を削除
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </SimpleModal>
    </div>
  );
}
