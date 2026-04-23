import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-0">
      <div className="text-center max-w-md px-6">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-2">
          <span className="text-4xl font-mono font-bold text-text-tertiary">
            404
          </span>
        </div>
        <h1 className="text-h1 text-text-primary mb-2">Page not found</h1>
        <p className="text-body text-text-secondary mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-[#D4945A] to-[#C88550] px-6 py-3 text-[0.875rem] font-medium text-on-accent transition-all hover:brightness-110"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
