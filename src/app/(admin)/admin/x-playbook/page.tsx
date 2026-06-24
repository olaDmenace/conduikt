"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Sparkles, Calendar, Save, Check } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
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
        title="X Playbook — bracket inputs"
        description="Human-input values the daily cron substitutes into the X playbook's bracket posts. Fill these any time before the post fires; empty means the post is skipped that day."
      />

      <div className="space-y-6">
        {items === null ? (
          <Card>
            <CardContent className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-accent animate-spin" />
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-text-secondary">
              No bracket templates need human input right now.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="animate-in">
              <CardContent className="space-y-3 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-h3 text-text-primary">Shipping digest</h2>
                    <p className="text-small text-text-secondary mt-1">
                      Tweet-worthy commits from Conduikt + PitchOdds, grouped by week. {suggestionsGeneratedAt && (
                        <>Last refreshed {new Date(suggestionsGeneratedAt).toLocaleString()} — re-run <code className="font-mono text-data">node scripts/x-playbook/git-shipping-digest.mjs</code> to update.</>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={loadSuggestions}
                    disabled={suggestionsLoading}
                  >
                    {suggestionsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                </div>
                {suggestionGroups && suggestionGroups.length > 0 && (
                  <div className="space-y-4 mt-3 max-h-[480px] overflow-y-auto">
                    {suggestionGroups.slice(0, 4).map((group) => (
                      <div key={group.weekKey}>
                        <p className="text-tiny font-mono uppercase tracking-wider text-text-tertiary mb-2">
                          {group.weekKey} · {group.items.length} shipped
                        </p>
                        <ul className="space-y-2">
                          {group.items.map((s) => (
                            <li
                              key={`${s.repo}-${s.sha}`}
                              className="flex items-start gap-2 rounded-lg border border-border-default bg-surface-2 p-3"
                            >
                              <Badge variant="secondary" className="shrink-0">
                                {s.repo}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-small text-text-primary">{s.clean}</p>
                                <p className="text-tiny text-text-tertiary mt-0.5">
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
                  <p className="text-small text-text-tertiary mt-2">
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
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary">Day {item.day}</Badge>
                          <Badge variant="secondary">Slot {item.slot}</Badge>
                          <Badge variant={allFilled ? "success" : "secondary"}>
                            {allFilled ? "Ready" : "Needs input"}
                          </Badge>
                        </div>
                        <p className="text-small text-text-secondary mt-2 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Fires {fireLabel} WAT
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border-default bg-surface-2 p-3 text-small text-text-secondary whitespace-pre-wrap font-mono">
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
                            <label className="text-small text-text-secondary">
                              {f.label}{" "}
                              <code className="text-tiny font-mono text-text-tertiary">
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
                                className="w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-3 text-text-primary placeholder:text-text-tertiary font-sans text-[0.9375rem] transition-all duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-glow)] focus:outline-none resize-y"
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
                            <div className="flex items-center justify-between text-tiny">
                              <span className="text-text-tertiary">
                                {f.hint}
                              </span>
                              <div className="flex items-center gap-2">
                                {f.name === "SHIPPED_FEATURE" && suggestions && suggestions.length > 0 && (
                                  <select
                                    className="text-tiny rounded-md border border-border-default bg-surface-2 px-2 py-1 text-text-secondary"
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
                                  variant={isDirty ? "primary" : "secondary"}
                                  onClick={() => save(item.ref, f.name)}
                                  disabled={isSaving || !isDirty}
                                >
                                  {isSaving ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : isDirty ? (
                                    <Save className="h-3 w-3" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                  {isSaving ? "Saving" : isDirty ? "Save" : "Saved"}
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
