export const CATEGORIES = {
  study_group: { label: "勉強会", color: "bg-orange-200 text-orange-900", dotColor: "bg-orange-500" },
  first_consult: { label: "初回コンサル", color: "bg-cyan-200 text-cyan-900", dotColor: "bg-cyan-500" },
  live_talk: { label: "ライブトーク", color: "bg-pink-200 text-pink-900", dotColor: "bg-pink-500" },
  line_reply: { label: "ライン返信", color: "bg-green-200 text-green-900", dotColor: "bg-green-500" },
  column: { label: "音声コラム", color: "bg-purple-200 text-purple-900", dotColor: "bg-purple-500" },
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
  return CATEGORIES[key as CategoryKey] || { label: key, color: "bg-gray-100 text-gray-800", dotColor: "bg-gray-500" };
}
