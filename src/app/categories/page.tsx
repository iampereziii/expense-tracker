"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCategories } from "@/hooks/useCategories";
import { addCategory, archiveCategory, renameCategory } from "@/services/categories";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WRITE_ERROR_MESSAGE } from "@/lib/constants";

export default function CategoriesPage() {
  const { user, ready, configured } = useAuth();
  const enabled = ready && configured && !!user;
  const { categories } = useCategories(enabled);

  const [name, setName] = useState("");
  const [syncError, setSyncError] = useState<string | null>(null);
  const onSyncError = () => setSyncError(WRITE_ERROR_MESSAGE);

  // Writes are never awaited: the list re-renders from the local cache straight
  // away, online or off. Awaiting would block on the server's acknowledgement.
  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSyncError(null);
    addCategory(trimmed, undefined, onSyncError);
    setName("");
  }

  function handleRename(id: string, current: string) {
    const next = window.prompt("Rename category", current);
    if (next && next.trim() && next.trim() !== current) {
      setSyncError(null);
      renameCategory(id, next.trim(), onSyncError);
    }
  }

  function handleArchive(id: string, label: string) {
    // Archive, not delete — past expenses keep resolving this category (Rule 7).
    if (window.confirm(`Remove "${label}"? It stays on past expenses, just hidden here.`)) {
      setSyncError(null);
      archiveCategory(id, onSyncError);
    }
  }

  return (
    <section className="pt-6">
      <h1 className="text-lg font-semibold">Categories</h1>
      {syncError ? (
        <p role="alert" className="mt-3 text-sm text-danger-fg">
          {syncError}
        </p>
      ) : null}

      <Card tone="sunken" className="mt-4">
        <div className="flex gap-2">
          <input
            placeholder="New category"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-xl border border-line px-3 py-3 outline-none"
          />
          <Button onClick={handleAdd} disabled={!name.trim()}>
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
