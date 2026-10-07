import * as React from "react";
import { cn } from "@/src/lib/utils/cn";

// Renders any agent's parsed output readably, whatever its shape: strings
// become paragraphs, string lists become bullet lists, lists of objects
// become titled blocks, objects become labelled fields. The per-agent
// previews in Content Studio stay the richer view; this one exists so the
// first-week pack can show every agent's work on one page.

const SKIP = new Set(["type", "usage", "id", "raw", "_meta", "conduiktRoute", "projectPath", "route"]);
const TITLE_KEYS = ["title", "name", "headline", "subject", "keyword", "term", "angle", "hook", "day", "label", "phase", "step", "week"];

function humanize(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function isEmpty(v: unknown): boolean {
  if (v == null || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  if (isPlainObject(v)) return Object.keys(v).filter((k) => !SKIP.has(k)).every((k) => isEmpty(v[k]));
  return false;
}

function titleOf(o: Record<string, unknown>): { title: string | null; key: string | null } {
  for (const k of TITLE_KEYS) {
    const v = o[k];
    if (typeof v === "string" || typeof v === "number") return { title: String(v), key: k };
  }
  return { title: null, key: null };
}

function Value({ value, depth }: { value: unknown; depth: number }): React.ReactElement | null {
  if (isEmpty(value)) return null;
  if (typeof value === "string") return <p className="whitespace-pre-wrap text-body-s text-text">{value}</p>;
  if (typeof value === "number" || typeof value === "boolean")
    return <p className="text-body-s text-text">{String(value)}</p>;

  if (Array.isArray(value)) {
    if (value.every((v) => typeof v !== "object" || v === null)) {
      return (
        <ul className="list-disc space-y-1 pl-5 text-body-s text-text marker:text-text-3">
          {value.map((v, i) => (
            <li key={i}>{String(v)}</li>
          ))}
        </ul>
      );
    }
    return (
      <div className="space-y-2">
        {value.map((v, i) =>
          isPlainObject(v) ? (
            <Block key={i} obj={v} depth={depth + 1} />
          ) : (
            <Value key={i} value={v} depth={depth + 1} />
          )
        )}
      </div>
    );
  }

  if (isPlainObject(value)) return <Fields obj={value} depth={depth} />;
  return null;
}

function Block({ obj, depth }: { obj: Record<string, unknown>; depth: number }) {
  const { title, key } = titleOf(obj);
  const rest = Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));
  return (
    <div className="space-y-2 rounded-md border border-line bg-ground p-3">
      {title && <p className="text-title text-text">{title}</p>}
      <Fields obj={rest} depth={depth} />
    </div>
  );
}

function Fields({ obj, depth }: { obj: Record<string, unknown>; depth: number }) {
  if (depth > 5) return null;
  const entries = Object.entries(obj).filter(([k, v]) => !SKIP.has(k) && !isEmpty(v));
  // Short scalars (effort, priority, a score) read better on one line.
  const isShort = (v: unknown) =>
    typeof v === "number" || typeof v === "boolean" || (typeof v === "string" && v.length <= 40 && !v.includes("\n"));
  const short = entries.filter(([, v]) => isShort(v));
  const long = entries.filter(([, v]) => !isShort(v));
  return (
    <dl className="space-y-3">
      {short.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {short.map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-1.5">
              <dt className="text-label text-text-3">{humanize(k)}</dt>
              <dd className="text-body-s text-text">{String(v)}</dd>
            </div>
          ))}
        </div>
      )}
      {long.map(([k, v]) => (
        <div key={k} className="space-y-1">
          <dt className="text-label text-text-3">{humanize(k)}</dt>
          <dd>
            <Value value={v} depth={depth + 1} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AgentOutput({ output, className }: { output: unknown; className?: string }) {
  if (isEmpty(output)) return <p className={cn("text-body-s text-text-3", className)}>This agent returned nothing to show.</p>;
  return (
    <div className={cn("space-y-3", className)}>
      <Value value={output} depth={0} />
    </div>
  );
}
