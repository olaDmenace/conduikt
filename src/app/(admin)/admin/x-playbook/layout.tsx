import { ToastProvider } from "@/src/components/ui/toast";

// Scoped ToastProvider — the (admin) layout intentionally omits the global one
// (per project rule). This page calls useToast() so we wrap just it.

export default function XPlaybookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}
