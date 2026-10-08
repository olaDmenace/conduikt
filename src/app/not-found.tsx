import Image from "next/image";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4 py-16">
      <div className="w-full max-w-md text-center">
        <Link
          href="/"
          className="mx-auto mb-10 inline-flex items-center gap-2.5 text-text"
          aria-label="Conduikt home"
        >
          <Image src="/conduikt-icon.png" alt="" width={32} height={32} className="h-8 w-8" />
          <span className="font-display text-lg font-medium tracking-tight">
            Conduikt
          </span>
        </Link>
        <p className="mb-3 text-label text-text-3">404</p>
        <h1 className="mb-4 text-display-s text-text">Page not found</h1>
        <p className="mb-8 text-body text-text-2">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
