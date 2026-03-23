"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createInstructor, updateInstructor, deleteInstructor } from "@/app/actions/instructors";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

type Instructor = { id: string; name: string; scheduleCount: number };

export function InstructorList({ instructors }: { instructors: Instructor[] }) {
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!newName.trim()) return;
    setLoading(true);
    setError("");
    try {
      await createInstructor(newName.trim());
      setNewName("");
    } catch {
      setError("追加に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return;
    setLoading(true);
    setError("");
    try {
      await updateInstructor(id, editName.trim());
      setEditId(null);
    } catch {
      setError("変更に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？関連する予定も全て削除されます。`)) return;
    setLoading(true);
    setError("");
    try {
      await deleteInstructor(id);
    } catch {
      setError("削除に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      {error && <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</p>}

      {/* 新規追加 */}
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="講師名を入力"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={loading || !newName.trim()}>
          <Plus className="h-4 w-4 mr-1" />追加
        </Button>
      </div>

      {/* 一覧 */}
      <div className="space-y-2">
        {instructors.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">講師が登録されていません</p>
        )}
        {instructors.map((inst) => (
          <Card key={inst.id}>
            <CardContent className="p-3 flex items-center gap-3">
              {editId === inst.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(inst.id)}
                  />
                  <Button size="sm" variant="outline" onClick={() => handleUpdate(inst.id)} disabled={loading}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{inst.name}</span>
                  <span className="text-xs text-muted-foreground">予定 {inst.scheduleCount}件</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setEditId(inst.id); setEditName(inst.name); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDelete(inst.id, inst.name)}
                    disabled={loading}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
