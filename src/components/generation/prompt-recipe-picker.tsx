"use client";

import { useState, useRef, useEffect } from "react";
import { BookOpen, ChevronDown, Check } from "@/src/components/ui/lucide-icons";
import { cn } from "@/src/lib/utils/cn";
import { PROMPT_RECIPES, type PromptRecipe } from "@/src/lib/ai/prompt-recipes";

interface Props {
  /** Called with the recipe's template body when a recipe is picked. */
  onSelect: (recipe: PromptRecipe) => void;
  /**
   * If true, the picker's button asks the user to confirm before
   * replacing existing textarea content. Caller should pass
   * `hasPrompt=true` when the textarea already has meaningful content.
   */
  hasPrompt?: boolean;
  className?: string;
}

/**
 * Compact recipe picker that lives above the prompt textarea.
 *
 * Click the pill → a small popover lists the 6 proven marketing
 * frameworks. Selecting one calls onSelect with the recipe; the caller
 * decides whether to replace or append (currently: replace, with a
 * confirm dialog when the textarea has content).
 *
 * Kept as a lightweight custom popover instead of Radix Popover so it
 * doesn't drag another dependency and behaves predictably inside forms.
 * Click-outside dismisses; Escape closes; focus returns to the trigger.
 */
export function PromptRecipePicker({ onSelect, hasPrompt, className }: Props) {
  const [open, setOpen] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handlePick(recipe: PromptRecipe) {
    // If the textarea already has content, ask before wiping it. Native
    // confirm() is jarring but reliable across every browser without an
    // extra modal dep. Ok for a low-frequency safety check.
    if (hasPrompt) {
      const proceed = window.confirm(
        `Replace your current prompt with the "${recipe.name}" recipe?`
      );
      if (!proceed) return;
    }
    onSelect(recipe);
    setPickedId(recipe.id);
    setOpen(false);
    // Brief flash so the user sees which recipe they picked; the badge
    // clears itself after a moment.
    setTimeout(() => setPickedId(null), 1600);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-caption text-text-2 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)]",
          "hover:bg-surface-2 hover:text-text hover:border-line-strong",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          open && "bg-surface-2 text-text border-line-strong"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Insert a proven prompt framework"
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span>Recipes</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-30 mt-1.5 w-[320px] rounded-lg border border-line bg-surface shadow-[var(--shadow-float)] p-1.5 max-h-[380px] overflow-y-auto"
        >
          <div className="px-2.5 pt-1 pb-2">
            <p className="text-label text-text-3">Proven frameworks</p>
            <p className="text-caption text-text-3 mt-1 leading-snug">
              Each recipe scaffolds the prompt with fill-in-the-blank markers.
              Replace the bracketed bits and edit freely. Nothing is fixed.
            </p>
          </div>

          <ul className="space-y-0.5">
            {PROMPT_RECIPES.map((recipe) => {
              const isPicked = pickedId === recipe.id;
              return (
                <li key={recipe.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handlePick(recipe)}
                    className={cn(
                      "w-full text-left rounded-md px-2.5 py-2 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)]",
                      "hover:bg-surface-2 focus-visible:outline-none focus-visible:bg-surface-2",
                      isPicked && "bg-accent-soft"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-body-s font-medium text-text">
                        {recipe.name}
                      </span>
                      {isPicked && (
                        <Check className="h-3.5 w-3.5 text-accent" aria-hidden />
                      )}
                    </div>
                    <p className="mt-0.5 text-caption text-text-3 leading-snug">
                      {recipe.usageHint}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
