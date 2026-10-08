import { AlertCircle } from "@/src/components/ui/lucide-icons";

// Compact inline warning explaining the "Google hasn't verified this
// app" screen that users see during OAuth until Conduikt's GCP
// verification completes. Drop this anywhere we render a Google
// Connect button so users aren't blindsided by the warning page.
//
// Remove this component (and its usages) once verification lands.
export function UnverifiedAppWarning() {
  return (
    <div className="mt-3 flex max-w-md items-start gap-2 rounded-md bg-accent-soft px-3 py-2 text-left text-body-s">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p className="text-text-2">
        Google may show a security warning while we finish launching. That&apos;s
        expected. Click <span className="font-medium text-text">Advanced</span>,
        then{" "}
        <span className="font-medium text-text">Go to conduikt.com (unsafe)</span>{" "}
        to continue. We can only read your data, never change it.
      </p>
    </div>
  );
}
