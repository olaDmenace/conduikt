import { AlertCircle } from "lucide-react";

// Compact inline warning explaining the "Google hasn't verified this
// app" screen that users see during OAuth until Conduikt's GCP
// verification completes. Drop this anywhere we render a Google
// Connect button so users aren't blindsided by the warning page.
//
// Remove this component (and its usages) once verification lands.
export function UnverifiedAppWarning() {
  return (
    <div className="flex gap-2 items-start text-left rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 mt-3 text-small max-w-md">
      <AlertCircle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
      <p className="text-text-secondary leading-relaxed">
        Google may show a security warning &mdash; this is normal during
        our launch. Click{" "}
        <span className="font-medium text-text-primary">Advanced</span>
        {" "}then{" "}
        <span className="font-medium text-text-primary">Go to conduikt.com (unsafe)</span>
        {" "}to continue. Access is read-only.
      </p>
    </div>
  );
}
