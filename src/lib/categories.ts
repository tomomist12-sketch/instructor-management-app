export const CATEGORIES = {
  study_group: { label: "勉強会", color: "border border-[#d7b84f] bg-[#f5dc8a] text-[#2b281d]", dotColor: "bg-[#e7c95f]" },
  first_consult: { label: "初回コンサル", color: "border border-[#65b9d0] bg-[#bde6ef] text-[#1f3036]", dotColor: "bg-[#7cc8dd]" },
  live_talk: { label: "ライブトーク", color: "border border-[#d5775d] bg-[#efb49f] text-[#35241f]", dotColor: "bg-[#df8568]" },
  line_reply: { label: "ライン返信", color: "border border-[#64ad7d] bg-[#bfe5cb] text-[#1f3326]", dotColor: "bg-[#74ba8c]" },
  column: { label: "音声コラム", color: "border border-[#4f46d8] bg-[#eceaff] text-[#342c98]", dotColor: "bg-[#4f46d8]" },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export const CATEGORY_OPTIONS = [
  { value: "line_reply", label: "ライン返信" },
  { value: "first_consult", label: "初回コンサル" },
  { value: "study_group", label: "勉強会" },
  { value: "live_talk", label: "ライブトーク" },
  { value: "column", label: "音声コラム" },
] as const;

export function getCategoryInfo(key: string) {
  return CATEGORIES[key as CategoryKey] || { label: key, color: "border border-[#d8d0c4] bg-[#fffefa] text-[#25231f]", dotColor: "bg-[#716d66]" };
}
