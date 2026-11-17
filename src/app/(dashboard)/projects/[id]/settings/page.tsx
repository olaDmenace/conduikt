"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Trash2, AlertTriangle, Upload, Palette, Check, ArrowUpRight, Search } from "@/src/components/ui/lucide-icons";
import type { NapFieldReport, NapReport } from "@/src/lib/local/nap-check";
import { Badge } from "@/src/components/ui/badge";
import { BUSINESS_TYPES, PLAYBOOKS, playbookFor, type BusinessType } from "@/src/lib/playbooks";
import { AUTOMATION_MODES, normalizeMode, type AutomationMode } from "@/src/lib/automation/mode";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import { Skeleton } from "@/src/components/ui/skeleton";

import { useToast } from "@/src/components/ui/toast";

// Mirrors DIRECTION_MAX_CHARS in src/lib/ai/direction.ts.
const DIRECTION_LIMIT = 12_000;

interface Project {
  id: string;
  name: string;
  website_url: string | null;
  description: string | null;
  target_audience: unknown;
  value_proposition: string | null;
  brand_voice: unknown;
  competitors: unknown;
  positioning_statement: string | null;
  keywords: unknown;
  client_name: string | null;
  client_logo_url: string | null;
  report_accent_color: string | null;
  business_type: BusinessType | null;
  automation_mode: AutomationMode | null;
  wants_hosted_page: boolean | null;
  business_location: string | null;
  services: string[] | null;
  phone?: string | null;
  address_line?: string | null;
  city?: string | null;
  booking_url?: string | null;
  review_url?: string | null;
  nap_report?: NapReport | null;
  nap_checked_at?: string | null;
}

function whenLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** One row of the consistency report: label, status chip, the variants seen. */
function NapRow({ label, field, extra }: { label: string; field: NapFieldReport; extra?: React.ReactNode }) {
  if (!field.expected) {
    return (
      <div className="flex flex-col gap-1 border-t border-line py-3 first:border-t-0 first:pt-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-title text-text">{label}</span>
          <Badge variant="secondary">Not saved</Badge>
        </div>
        <p className="text-body-s text-text-2">Add it above and check again.</p>
      </div>
    );
  }
  const missing = field.found_on.length === 0;
  return (
    <div className="flex flex-col gap-1 border-t border-line py-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-title text-text">{label}</span>
        {field.consistent ? (
          <Badge variant="success">Consistent</Badge>
        ) : missing ? (
          <Badge variant="error">Not found</Badge>
        ) : (
          <Badge variant="warning">{field.variants.length} versions</Badge>
        )}
      </div>
      <p className="text-body-s text-text-2">
        {missing
          ? `"${field.expected}" isn't on any page we checked.`
          : `On ${field.found_on.length} of your pages.`}
      </p>
      {field.variants.length > 1 && (
        <ul className="mt-1 space-y-1">
          {field.variants.map((v, i) => (
            <li key={v} className="flex items-center gap-2 text-body-s">
              <span className="font-mono text-[11px] uppercase tracking-wide text-text-3">{i === 0 ? "Saved" : "Site"}</span>
              <span className="text-text">{v}</span>
            </li>
          ))}
        </ul>
      )}
      {extra}
    </div>
  );
}

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [positioningStatement, setPositioningStatement] = useState("");
  const [targetAudienceText, setTargetAudienceText] = useState("");
  const [brandVoiceText, setBrandVoiceText] = useState("");
  const [competitorsText, setCompetitorsText] = useState("");
  const [keywordsText, setKeywordsText] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientLogoUrl, setClientLogoUrl] = useState("");
  const [reportAccentColor, setReportAccentColor] = useState("#D9663A");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [userPlan, setUserPlan] = useState("free");

  // Playbook and mode (audit §4.1, D4)
  const [businessType, setBusinessType] = useState<BusinessType>("saas");
  const [automationMode, setAutomationMode] = useState<AutomationMode>("check_all");
  const [savingMode, setSavingMode] = useState(false);
  const [wantsHostedPage, setWantsHostedPage] = useState(false);
  const [businessLocation, setBusinessLocation] = useState("");
  const [servicesText, setServicesText] = useState("");

  // Business details (audit §5.2) and the consistency check
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [reviewUrl, setReviewUrl] = useState("");
  const [napReport, setNapReport] = useState<NapReport | null>(null);
  const [checkingNap, setCheckingNap] = useState(false);

  useEffect(() => {
    async function fetchProject() {
      const [res, profileRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch("/api/profile"),
      ]);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        setName(data.name || "");
        setWebsiteUrl(data.website_url || "");
        setDescription(data.description || "");
        setValueProposition(data.value_proposition || "");
        setPositioningStatement(data.positioning_statement || "");
        setTargetAudienceText(
          data.target_audience ? JSON.stringify(data.target_audience, null, 2) : ""
        );
        setBrandVoiceText(
          data.brand_voice ? JSON.stringify(data.brand_voice, null, 2) : ""
        );
        setCompetitorsText(
          data.competitors ? JSON.stringify(data.competitors, null, 2) : ""
        );
        setKeywordsText(
          data.keywords ? JSON.stringify(data.keywords, null, 2) : ""
        );
        setClientName(data.client_name || "");
        setClientLogoUrl(data.client_logo_url || "");
        setReportAccentColor(data.report_accent_color || "#D9663A");
        setBusinessType(playbookFor(data.business_type).id);
        setAutomationMode(normalizeMode(data.automation_mode));
        setWantsHostedPage(Boolean(data.wants_hosted_page));
        setBusinessLocation(data.business_location || "");
        setServicesText(Array.isArray(data.services) ? data.services.join(", ") : "");
        setPhone(data.phone || "");
        setAddressLine(data.address_line || "");
        setCity(data.city || "");
        setBookingUrl(data.booking_url || "");
        setReviewUrl(data.review_url || "");
        setNapReport(data.nap_report ?? null);
      } else {
        toast("Failed to load project", "error");
      }
      if (profileRes.ok) {
        const profile = await profileRes.json();
        setUserPlan(profile.plan || "free");
      }
      setLoading(false);
    }
    fetchProject();
  }, [id, toast]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Project name is required.", "warning");
      return;
    }

    // Parse JSON fields
    let targetAudience = null;
    let brandVoice = null;
    let competitors = null;
    let keywords = null;

    try {
      if (targetAudienceText.trim()) targetAudience = JSON.parse(targetAudienceText);
    } catch {
      toast("Target audience must be valid JSON.", "warning");
      return;
    }
    try {
      if (brandVoiceText.trim()) brandVoice = JSON.parse(brandVoiceText);
    } catch {
      toast("Brand voice must be valid JSON.", "warning");
      return;
    }
    try {
      if (competitorsText.trim()) competitors = JSON.parse(competitorsText);
    } catch {
      toast("Competitors must be valid JSON.", "warning");
      return;
    }
    try {
      if (keywordsText.trim()) keywords = JSON.parse(keywordsText);
    } catch {
      toast("Keywords must be valid JSON.", "warning");
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        website_url: websiteUrl.trim() || null,
        description: description.trim() || null,
        value_proposition: valueProposition.trim() || null,
        positioning_statement: positioningStatement.trim() || null,
        target_audience: targetAudience,
        brand_voice: brandVoice,
        competitors,
        keywords,
        client_name: clientName.trim() || null,
        client_logo_url: clientLogoUrl.trim() || null,
        report_accent_color: reportAccentColor || "#D9663A",
        business_type: businessType,
        automation_mode: automationMode,
        wants_hosted_page: wantsHostedPage,
        business_location: businessLocation.trim() || null,
        services: servicesText
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
        phone: phone.trim() || null,
        address_line: addressLine.trim() || null,
        city: city.trim() || null,
        booking_url: bookingUrl.trim() || null,
        review_url: reviewUrl.trim() || null,
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setProject(updated);
      toast("Project saved", "success");
    } else {
      const err = await res.json();
      toast(err.error || "Failed to update project", "error");
    }
    setSaving(false);
  }

  // The mode saves on its own the moment you pick it, so changing your mind
  // never waits on the big Save button.
  async function chooseMode(mode: AutomationMode) {
    if (mode === automationMode || savingMode) return;
    const previous = automationMode;
    setAutomationMode(mode);
    setSavingMode(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ automation_mode: mode }),
    }).catch(() => null);
    if (res?.ok) {
      const label = AUTOMATION_MODES.find((m) => m.id === mode)?.label ?? "Mode";
      toast(`${label}: saved`, "success");
    } else {
      setAutomationMode(previous);
      toast("Couldn't save that. Try again.", "error");
    }
    setSavingMode(false);
  }

  // Checks the details saved on the server against the website, so
  // unsaved edits in the form don't count until Save.
  async function checkDetails() {
    if (checkingNap) return;
    setCheckingNap(true);
    const res = await fetch(`/api/projects/${id}/nap-check`, { method: "POST" }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setNapReport(data.report ?? null);
      if (data.report?.status === "unreachable") {
        toast(data.report.message || "We couldn't read your website. Try again in a few minutes.", "warning");
      } else {
        toast(data.report?.issues?.length ? "Checked. Some details need attention." : "Checked. Your details match.", "success");
      }
    } else {
      const err = res ? await res.json().catch(() => ({})) : {};
      toast(err.error || "Couldn't check your website. Try again.", "error");
    }
    setCheckingNap(false);
  }

  async function handleDelete() {
    if (deleteConfirmText !== project?.name) return;

    setDeleting(true);
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });

    if (res.ok) {
      toast("Project deleted", "success");
      router.push("/dashboard");
    } else {
      const err = await res.json();
      toast(err.error || "Failed to delete project", "error");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Project settings" description="Your project's details and what every agent knows about it" />
        <div className="max-w-2xl space-y-6" role="status" aria-label="Loading settings">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div>
        <PageHeader title="Project settings" description="We couldn't find this project." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Project settings" description="Your project's details and what every agent knows about it" />


      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        {/* General */}
        <Card className="animate-in">
          <CardHeader>
            <CardTitle className="text-heading">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Project name"
              placeholder="My Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Website URL"
              type="url"
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-body-s text-text-2">Description</label>
              <textarea
                className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent min-h-[80px] resize-y"
                placeholder="Brief description of your project"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* How hands-on you want to be (docs/DESIGN.md Modes; D4) */}
        <Card className="animate-in" style={{ animationDelay: "30ms" }}>
          <CardHeader>
            <CardTitle className="text-heading">How hands-on you want to be</CardTitle>
            <p className="text-body-s text-text-2">
              Saved the moment you pick one. Change it any time.
            </p>
          </CardHeader>
          <CardContent>
            <div role="radiogroup" aria-label="How hands-on you want to be" className="grid grid-cols-1 gap-2">
              {AUTOMATION_MODES.map((m) => {
                const selected = automationMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={savingMode}
                    onClick={() => chooseMode(m.id)}
                    className={`flex items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors ${
                      selected
                        ? "border-accent bg-accent-soft"
                        : "border-line bg-surface hover:border-line-strong hover:bg-surface-2"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        selected ? "border-accent bg-accent" : "border-line-strong bg-ground"
                      }`}
                      aria-hidden
                    >
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <span>
                      <span className="block text-title text-text">{m.label}</span>
                      <span className="block text-body-s text-text-2">{m.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* What kind of business (playbook; audit §4.1) */}
        <Card className="animate-in" style={{ animationDelay: "45ms" }}>
          <CardHeader>
            <CardTitle className="text-heading">What kind of business</CardTitle>
            <p className="text-body-s text-text-2">
              Your first-week pack, default channels and the words we use follow this.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div role="radiogroup" aria-label="Kind of business" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BUSINESS_TYPES.map((t) => {
                const p = PLAYBOOKS[t];
                const selected = businessType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setBusinessType(t)}
                    className={`rounded-md border px-4 py-3 text-left transition-colors ${
                      selected
                        ? "border-accent bg-accent-soft"
                        : "border-line bg-surface hover:border-line-strong hover:bg-surface-2"
                    }`}
                  >
                    <span className="block text-title text-text">{p.label}</span>
                    <span className="block text-body-s text-text-2">{p.blurb}</span>
                  </button>
                );
              })}
            </div>
            {project.business_type !== null && businessType !== project.business_type && (
              <p className="text-caption text-text-2">
                Changing this changes which agents run in your first week and the channels we suggest. Saved with the rest of this page.
              </p>
            )}

            <button
              type="button"
              role="checkbox"
              aria-checked={wantsHostedPage}
              onClick={() => setWantsHostedPage((v) => !v)}
              className={`flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors ${
                wantsHostedPage
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-surface hover:border-line-strong hover:bg-surface-2"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                  wantsHostedPage ? "border-accent bg-accent" : "border-line-strong bg-ground"
                }`}
                aria-hidden
              >
                {wantsHostedPage && <Check className="h-3 w-3 text-white" />}
              </span>
              <span>
                <span className="block text-title text-text">Build my page</span>
                <span className="block text-body-s text-text-2">
                  No website yet? We build and host your first page from your answers.
                </span>
              </span>
            </button>

            {(wantsHostedPage || businessType === "local") && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Where you work"
                  placeholder="Try: Lekki, Lagos"
                  value={businessLocation}
                  onChange={(e) => setBusinessLocation(e.target.value)}
                />
                <Input
                  label="What you offer"
                  placeholder="Try: pipe repairs, drain cleaning"
                  hint="Separate each service with a comma."
                  value={servicesText}
                  onChange={(e) => setServicesText(e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business details (audit §5.2): the facts every page should agree on */}
        <Card className="animate-in" style={{ animationDelay: "55ms" }}>
          <CardHeader>
            <CardTitle className="text-heading">Business details</CardTitle>
            <p className="text-body-s text-text-2">
              How customers reach you. Google and AI answers trust a business more when these read the same everywhere.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Phone"
                type="tel"
                placeholder="Try: 0803 123 4567"
                hint="The number customers call or message."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="City"
                placeholder="Try: Lekki, Lagos"
                hint="The town or area you serve from."
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <Input
              label="Address"
              placeholder="Try: 12 Admiralty Way"
              hint="Street and building, as it appears on your signboard."
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
            />
            <Input
              label="Booking link"
              type="url"
              placeholder="https://calendly.com/your-business"
              hint="Where customers book you, e.g. a Calendly or WhatsApp link."
              value={bookingUrl}
              onChange={(e) => setBookingUrl(e.target.value)}
            />
            <Input
              label="Review link"
              type="url"
              placeholder="https://g.page/r/your-business/review"
              hint="Where customers leave a review, e.g. your Google Business profile link."
              value={reviewUrl}
              onChange={(e) => setReviewUrl(e.target.value)}
            />

            {/* Consistency check */}
            <div className="flex flex-col gap-3 rounded-lg border border-line bg-ground p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-title text-text">Check your details are consistent</p>
                  <p className="text-body-s text-text-2">
                    We read up to 30 of your pages and compare them with the details you saved.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" disabled={checkingNap} onClick={checkDetails}>
                  <Search className="h-4 w-4" />
                  {checkingNap ? "Checking…" : napReport ? "Check again" : "Check my pages"}
                </Button>
              </div>

              {napReport?.status === "unreachable" && (
                <div className="rounded-md border border-line bg-surface p-4" role="status">
                  <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-text-3">Nothing checked · {whenLabel(napReport.checked_at)}</p>
                  <p className="text-body-s text-text">
                    {napReport.message || "We couldn't read your website. Try again in a few minutes."}
                  </p>
                </div>
              )}

              {napReport && napReport.status !== "unreachable" && (
                <div className="rounded-md border border-line bg-surface p-4">
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-text-3">
                    {napReport.pages_checked} {napReport.pages_checked === 1 ? "page" : "pages"} checked · {whenLabel(napReport.checked_at)}
                  </p>
                  <NapRow label="Business name" field={napReport.name} />
                  <NapRow
                    label="Phone"
                    field={napReport.phone}
                    extra={
                      napReport.phone.other_numbers.length > 0 ? (
                        <p className="mt-1 text-body-s text-text-2">
                          Other numbers on your site: {napReport.phone.other_numbers.join(", ")}
                        </p>
                      ) : null
                    }
                  />
                  <NapRow
                    label="Address"
                    field={napReport.address}
                    extra={
                      city.trim() && napReport.address.expected ? (
                        <p className="mt-1 text-body-s text-text-2">
                          {napReport.address.city_found_on.length > 0
                            ? `Your city is on ${napReport.address.city_found_on.length} of your pages.`
                            : "Your city isn't on any page we checked."}
                        </p>
                      ) : null
                    }
                  />
                  <div className="flex flex-col gap-1 border-t border-line py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-title text-text">Ready for Google and AI answers</span>
                      {!napReport.structured_data.found ? (
                        <Badge variant="error">Missing</Badge>
                      ) : napReport.structured_data.name_matches === false ||
                        napReport.structured_data.phone_matches === false ||
                        napReport.structured_data.address_matches === false ? (
                        <Badge variant="warning">Doesn&apos;t match</Badge>
                      ) : (
                        <Badge variant="success">Matches</Badge>
                      )}
                    </div>
                    <p className="text-body-s text-text-2">
                      {napReport.structured_data.found
                        ? `Your pages tell Google what kind of business this is (${napReport.structured_data.types.join(", ")}).`
                        : "None of your pages tell Google what kind of business this is. Build my page adds it for you."}
                    </p>
                  </div>
                  {napReport.issues.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-line pt-3">
                      {napReport.issues.map((issue) => (
                        <li key={issue} className="flex items-start gap-2 text-body-s text-text-2">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Marketing Context */}
        <Card className="animate-in" style={{ animationDelay: "60ms" }}>
          <CardHeader>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <CardTitle className="text-heading">About your business</CardTitle>
                <p className="text-body-s text-text-2">
                  Every agent reads this so what it writes fits your business.
                </p>
              </div>
              <Link
                href={`/projects/${id}/onboarding`}
                className="hover-link inline-flex items-center gap-1 text-body-s text-accent hover:text-accent-hover"
              >
                Edit your business profile
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-body-s text-text-2">What makes you different</label>
              <textarea
                className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent min-h-[80px] resize-y"
                placeholder="What makes your product uniquely valuable?"
                value={valueProposition}
                onChange={(e) => setValueProposition(e.target.value)}
              />
            </div>

            <div id="direction" className="flex scroll-mt-24 flex-col gap-2 rounded-lg border border-line bg-ground p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <label htmlFor="direction-text" className="text-title text-text">
                    Your direction
                  </label>
                  <p className="text-body-s text-text-2">
                    Positioning, audience, content pillars, or notes from a strategy meeting. Every agent follows this over its own defaults.
                  </p>
                </div>
                <label className="hover-link cursor-pointer text-body-s text-accent hover:text-accent-hover">
                  Add from a file (.txt, .md)
                  <input
                    type="file"
                    accept=".txt,.md,text/plain,text/markdown"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      const text = (await file.text()).trim();
                      setPositioningStatement((cur) => (cur.trim() ? `${cur.trim()}\n\n${text}` : text).slice(0, DIRECTION_LIMIT));
                    }}
                  />
                </label>
              </div>
              <textarea
                id="direction-text"
                className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent min-h-[220px] resize-y"
                placeholder={"Paste your brief or meeting notes. For example:\nWe're positioning as the financial assistant on WhatsApp for 18–35s. Lead with daily transfers, then crypto. Content pillars: product, education, proof, trust, culture."}
                maxLength={DIRECTION_LIMIT}
                value={positioningStatement}
                onChange={(e) => setPositioningStatement(e.target.value)}
              />
              <p className="text-caption text-text-3">
                {positioningStatement.length.toLocaleString()} of {DIRECTION_LIMIT.toLocaleString()} characters · saved with the rest of this page
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-body-s text-text-2">
                Who you sell to <span className="font-mono text-text-3">(JSON)</span>
              </label>
              <textarea
                className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent font-mono min-h-[100px] resize-y"
                placeholder='{"personas": [{"role": "founder", "pain_points": ["..."]}]}'
                value={targetAudienceText}
                onChange={(e) => setTargetAudienceText(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-body-s text-text-2">
                Brand voice <span className="font-mono text-text-3">(JSON)</span>
              </label>
              <textarea
                className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent font-mono min-h-[100px] resize-y"
                placeholder='{"tone": "professional", "dos": ["..."], "donts": ["..."]}'
                value={brandVoiceText}
                onChange={(e) => setBrandVoiceText(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-body-s text-text-2">
                Competitors <span className="font-mono text-text-3">(JSON)</span>
              </label>
              <textarea
                className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent font-mono min-h-[100px] resize-y"
                placeholder='[{"name": "Competitor", "url": "https://...", "strengths": ["..."]}]'
                value={competitorsText}
                onChange={(e) => setCompetitorsText(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-body-s text-text-2">
                Keywords <span className="font-mono text-text-3">(JSON)</span>
              </label>
              <textarea
                className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent font-mono min-h-[100px] resize-y"
                placeholder='[{"term": "ai marketing", "volume": 5400, "difficulty": 45}]'
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Client Branding — Agency only */}
        {userPlan === "agency" && (
          <Card className="animate-in" style={{ animationDelay: "120ms" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-heading">
                <Palette className="h-4 w-4 text-text-3" />
                Client branding
              </CardTitle>
              <p className="text-body-s text-text-2">
                Put your client&apos;s brand on PDF reports.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Client name"
                placeholder="Acme Corp"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-body-s text-text-2">Client logo</label>
                {clientLogoUrl && (
                  <div className="mb-2 p-3 rounded-md border border-line bg-surface inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={clientLogoUrl}
                      alt="Client logo"
                      className="max-h-12 max-w-[200px] object-contain"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/png,image/jpeg,image/svg+xml";
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          toast("Logo must be under 2MB", "warning");
                          return;
                        }
                        setUploadingLogo(true);
                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("bucket", "logos");
                        formData.append("path", `projects/${id}/logo`);
                        const res = await fetch("/api/upload", {
                          method: "POST",
                          body: formData,
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setClientLogoUrl(data.url);
                          toast("Logo uploaded", "success");
                        } else {
                          toast("Failed to upload logo", "error");
                        }
                        setUploadingLogo(false);
                      };
                      input.click();
                    }}
                  >
                    {!uploadingLogo && <Upload className="h-4 w-4" />}
                    {uploadingLogo ? "Uploading…" : "Upload logo"}
                  </Button>
                  {clientLogoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setClientLogoUrl("")}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-body-s text-text-2">Report accent colour</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={reportAccentColor}
                    onChange={(e) => setReportAccentColor(e.target.value)}
                    aria-label="Pick report accent colour"
                    className="w-10 h-10 rounded-md border border-line-strong cursor-pointer bg-transparent"
                  />
                  <Input
                    placeholder="#D9663A"
                    value={reportAccentColor}
                    onChange={(e) => setReportAccentColor(e.target.value)}
                    className="max-w-[140px] font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save button */}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? (
              "Saving…"
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="max-w-2xl mt-8">
        <Card className="animate-in border-danger" style={{ animationDelay: "120ms" }}>
          <CardHeader>
            <CardTitle className="text-heading text-danger">Delete project</CardTitle>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <>
                <p className="text-body text-text-2 mb-4">
                  Deleting this project removes all its campaigns, content and audits.
                  You can&apos;t undo this.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete project
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-md bg-surface-2 border border-danger p-4">
                  <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                  <div>
                    <p className="text-title text-danger">
                      Are you sure?
                    </p>
                    <p className="text-body-s text-text-2 mt-1">
                      This will permanently delete <strong className="text-text">{project.name}</strong> and
                      everything in it, including audits, content and campaigns.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-body-s text-text-2 mb-1.5 block">
                    Type <strong className="text-text">{project.name}</strong> to confirm
                  </label>
                  <Input
                    placeholder={project.name}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={deleteConfirmText !== project.name || deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? (
                      "Deleting…"
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Delete this project
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
