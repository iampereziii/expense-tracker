"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCategories } from "@/hooks/useCategories";
import { addCategory, archiveCategory, renameCategory } from "@/services/categories";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function CategoriesPage() {
  const { user, ready, configured } = useAuth();
  const enabled = ready && configured && !!user;
  const { categories } = useCategories(enabled);

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await addCategory(trimmed);
      setName("");
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(id: string, current: string) {
    const next = window.prompt("Rename category", current);
    if (next && next.trim() && next.trim() !== current) {
      await renameCategory(id, next.trim());
    }
  }

  async function handleArchive(id: string, label: string) {
    // Archive, not delete — past expenses keep resolving this category (Rule 7).
    if (window.confirm(`Remove "${label}"? It stays on past expenses, just hidden here.`)) {
      await archiveCategory(id);
    }
  }

  return (
    <section className="pt-6">
      <h1 className="text-lg font-semibold">Categories</h1>

      <Card tone="sunken" className="mt-4">
        <div className="flex gap-2">
          <input
            placeholder="New category"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-xl border border-line px-3 py-3 outline-none"
          />
          <Button onClick={handleAdd} disabled={busy || !name.trim()}>
            Add
          </Button>
        </div>
      </Card>

      <Card className="mt-3">
        <ul className="divide-y divide-line">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: c.color ?? "#64748b" }}
                />
                {c.name}
              </span>
              <span className="flex gap-2">
                <Button variant="ghost" onClick={() => handleRename(c.id, c.name)} className="px-3 py-1.5 text-sm">
                  Rename
                </Button>
                <Button variant="danger" onClick={() => handleArchive(c.id, c.name)} className="px-3 py-1.5 text-sm">
                  Remove
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
