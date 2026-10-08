import Image from "next/image";
import Link from "next/link";
import { ToastProvider } from "@/src/components/ui/toast";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col items-center justify-center bg-ground px-4 py-12">
        <div className="w-full max-w-[400px]">
          {/* The Conduikt mark links back to the homepage so people can
              leave the auth flow without the browser back button. */}
          <Link
            href="/"
            aria-label="Conduikt home"
            className="mb-8 flex items-center justify-center gap-2.5 text-text"
          >
            <Image
              src="/conduikt-icon.png"
              alt=""
              width={32}
              height={32}
              priority
              className="h-8 w-8"
            />
            <span className="font-display text-lg font-medium tracking-tight">Conduikt</span>
          </Link>
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}
