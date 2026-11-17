import { isLocalPlanEnabled } from "@/src/lib/plans";
import { BillingClient } from "./billing-content";

// Server component so the Local plan check reads the server env, the
// same way /pricing does (isLocalPlanEnabled). The interactive page
// lives in billing-content.tsx.
export default function BillingPage() {
  return <BillingClient localEnabled={isLocalPlanEnabled()} />;
}
