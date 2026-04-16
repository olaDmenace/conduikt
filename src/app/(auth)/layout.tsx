import { ToastProvider } from "@/src/components/ui/toast";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen items-center justify-center bg-surface-0 px-4">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </ToastProvider>
  );
}
