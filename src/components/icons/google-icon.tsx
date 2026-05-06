// Outline-style Google "G" mark — matches lucide-react's stroke
// conventions (24x24 viewBox, fill=none, currentColor stroke, 2px
// width, round line caps and joins) so it visually lines up with the
// Twitter/Linkedin icons used on the same auth buttons. Path is from
// Tabler Icons (MIT) — lucide ships no Google icon for trademark
// reasons, but Tabler's outlined glyph is permissively licensed and
// uses the same drawing language.
export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M17.788 5.108a9 9 0 1 0 3.212 6.892h-8" />
    </svg>
  );
}
