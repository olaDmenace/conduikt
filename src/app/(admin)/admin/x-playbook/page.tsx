"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, Calendar, Save, Check } from "@/src/components/ui/lucide-icons";
import { Card, CardContent } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";

interface HumanField {
  name: string;
  label: string;
  hint?: string;
}

interface BracketItem {
  ref: string;
  day: number;
  slot: "A" | "B" | "C";
  fireAt: string;
  preview: string;
  fields: HumanField[];
  values: Record<string, { value: string; updatedAt: string }>;
}

interface FeatureSuggestion {
  repo: string;
  sha: string;
  subject: string;
  clean: string;
  date: string;
  weekKey: string;
}

interface SuggestionGroup {
  weekKey: string;
  items: FeatureSuggestion[];
}

export default function XPlaybookPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<BracketItem[] | null>(null);
  // local edit buffer keyed by `${ref}|${field}` so we can show dirty state
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<FeatureSuggestion[] | null>(null);
  const [suggestionGroups, setSuggestionGroups] = useState<SuggestionGroup[] | null>(null);
  const [suggestionsGeneratedAt, setSuggestionsGeneratedAt] = useState<string | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/x-playbook/inputs");
    if (!res.ok) {
      toast("Failed to load bracket templates", "error");
      return;
    }
    const data = await res.json();
    setItems(data.items);
    const seed: Record<string, string> = {};
    for (const item of data.items as BracketItem[]) {
      for (const f of item.fields) {
        const k = `${item.ref}|${f.name}`;
        seed[k] = item.values[f.name]?.value ?? "";
      }
    }
    setDraft(seed);
  }, [toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function save(ref: string, fieldName: string) {
    const key = `${ref}|${fieldName}`;
    setSavingKey(key);
    const res = await fetch("/api/x-playbook/inputs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref, field_name: fieldName, value: draft[key] ?? "" }),
    });
    if (res.ok) {
      toast("Saved", "success");
      await fetchItems();
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error ?? "Failed to save", "error");
    }
    setSavingKey(null);
  }

  async function loadSuggestions() {
    setSuggestionsLoading(true);
    const res = await fetch("/api/x-playbook/feature-suggestions");
    if (!res.ok) {
      toast("Could not load commit suggestions", "error");
      setSuggestionsLoading(false);
      return;
    }
    const data = await res.json();
    setSuggestions(data.items);
    setSuggestionGroups(data.groups);
    setSuggestionsGeneratedAt(data.generatedAt);
    setSuggestionsLoading(false);
  }

  function applySuggestion(itemRef: string, fieldName: string, cleanText: string) {
    const key = `${itemRef}|${fieldName}`;
    setDraft((d) => ({ ...d, [key]: cleanText }));
  }

  // Auto-load on mount so the user sees suggestions without clicking.
  useEffect(() => {
    loadSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader
        title="X playbook: bracket inputs"
        description="Human-input values the daily cron substitutes into the X playbook's bracket posts. Fill these any time before the post fires; empty means the post is skipped that day."
      />

      <div className="space-y-6">
        {items === null ? (
          <div className="space-y-6" role="status" aria-label="Loading">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="No bracket templates need human input right now." />
        ) : (
          <>
            <Card className="animate-in">
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-title text-text">Shipping digest</h2>
                    <p className="mt-1 text-body-s text-text-2">
                      Tweet-worthy commits from Conduikt + PitchOdds, grouped by week. {suggestionsGeneratedAt && (
                        <>Last refreshed {new Date(suggestionsGeneratedAt).toLocaleString()} — re-run <code className="font-mono text-body-s">node scripts/x-playbook/git-shipping-digest.mjs</code> to update.</>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadSuggestions}
                    disabled={suggestionsLoading}
                  >
                    {!suggestionsLoading && <Sparkles className="h-4 w-4" />}
                    {suggestionsLoading ? "Refreshing…" : "Refresh"}
                  </Button>
                </div>
                {suggestionGroups && suggestionGroups.length > 0 && (
                  <div className="mt-3 max-h-[480px] space-y-4 overflow-y-auto">
                    {suggestionGroups.slice(0, 4).map((group) => (
                      <div key={group.weekKey}>
                        <p className="mb-2 text-label text-text-3">
                          {group.weekKey} · {group.items.length} shipped
                        </p>
                        <ul className="space-y-2">
                          {group.items.map((s) => (
                            <li
                              key={`${s.repo}-${s.sha}`}
                              className="flex items-start gap-2 rounded-md border border-line bg-surface-2 p-3"
                            >
                              <Badge variant="secondary" className="shrink-0">
                                {s.repo}
                              </Badge>
                              <div className="min-w-0 flex-1">
                                <p className="text-body-s text-text">{s.clean}</p>
                                <p className="mt-0.5 font-mono text-caption text-text-3">
                                  {new Date(s.date).toLocaleDateString()} · {s.sha}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
                {suggestionGroups && suggestionGroups.length === 0 && (
                  <p className="mt-2 text-body-s text-text-3">
                    No tweet-worthy commits found. Re-run the digest script.
                  </p>
                )}
              </CardContent>
            </Card>

            {items.map((item, idx) => {
              const fireDate = new Date(item.fireAt);
              const fireLabel = fireDate.toLocaleString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Africa/Lagos",
              });
              const allFilled = item.fields.every(
                (f) => (draft[`${item.ref}|${f.name}`] ?? "").trim() !== ""
              );
              return (
                <Card
                  key={item.ref}
                  className="animate-in"
                  style={{ animationDelay: `${60 * (idx + 1)}ms` }}
                >
                  <CardContent className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">Day {item.day}</Badge>
                          <Badge variant="secondary">Slot {item.slot}</Badge>
                          <Badge variant={allFilled ? "success" : "warning"}>
                            {allFilled ? "Ready" : "Needs input"}
                          </Badge>
                        </div>
                        <p className="mt-2 flex items-center gap-1.5 text-body-s text-text-2">
                          <Calendar className="h-3.5 w-3.5" />
                          Fires {fireLabel} WAT
                        </p>
                      </div>
                    </div>

                    <div className="whitespace-pre-wrap rounded-md border border-line bg-surface-2 p-3 font-mono text-body-s text-text-2">
                      {item.preview}
                    </div>

                    <div className="space-y-3">
                      {item.fields.map((f) => {
                        const key = `${item.ref}|${f.name}`;
                        const current = draft[key] ?? "";
                        const saved = item.values[f.name]?.value ?? "";
                        const isDirty = current !== saved;
                        const isSaving = savingKey === key;
                        const isLong = f.name === "MISTAKE" || f.name === "LESSON" || f.name === "CALIB_STAT";
                        return (
                          <div key={f.name} className="space-y-1.5">
                            <label className="text-body-s text-text-2">
                              {f.label}{" "}
                              <code className="font-mono text-caption text-text-3">
                                {"{"}{f.name}{"}"}
                              </code>
                            </label>
                            {isLong ? (
                              <textarea
                                value={current}
                                onChange={(e) =>
                                  setDraft((d) => ({ ...d, [key]: e.target.value }))
                                }
                                placeholder={f.hint}
                                rows={2}
                                className="w-full resize-y rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              />
                            ) : (
                              <Input
                                value={current}
                                onChange={(e) =>
                                  setDraft((d) => ({ ...d, [key]: e.target.value }))
                                }
                                placeholder={f.hint}
                              />
                            )}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-caption">
                              <span className="text-text-3">
                                {f.hint}
                              </span>
                              <div className="flex items-center gap-2">
                                {f.name === "SHIPPED_FEATURE" && suggestions && suggestions.length > 0 && (
                                  <select
                                    className="h-8 rounded-md border border-line-strong bg-surface px-2 text-caption text-text-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                    onChange={(e) => {
                                      const idx = parseInt(e.target.value, 10);
                                      if (!Number.isNaN(idx) && suggestions[idx]) {
                                        applySuggestion(item.ref, f.name, suggestions[idx].clean);
                                      }
                                      e.target.value = "";
                                    }}
                                    defaultValue=""
                                  >
                                    <option value="" disabled>Use commit…</option>
                                    {suggestions.slice(0, 12).map((s, i) => (
                                      <option key={`${s.repo}-${s.sha}`} value={i}>
                                        {s.repo} · {s.clean.slice(0, 60)}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                <Button
                                  size="sm"
                                  variant={isDirty ? "primary" : "outline"}
                                  onClick={() => save(item.ref, f.name)}
                                  disabled={isSaving || !isDirty}
                                >
                                  {isSaving ? null : isDirty ? (
                                    <Save className="h-3 w-3" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                  {isSaving ? "Saving…" : isDirty ? "Save" : "Saved"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
