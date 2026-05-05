"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, Trash2, Loader2, AlertTriangle, Upload, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";

import { useToast } from "@/src/components/ui/toast";

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
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setProject(updated);
      toast("Project updated!", "success");
    } else {
      const err = await res.json();
      toast(err.error || "Failed to update project", "error");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (deleteConfirmText !== project?.name) return;

    setDeleting(true);
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });

    if (res.ok) {
      toast("Project deleted.", "success");
      router.push("/projects");
    } else {
      const err = await res.json();
      toast(err.error || "Failed to delete project", "error");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Project Settings" description="Manage project configuration" />
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div>
        <PageHeader title="Project Settings" description="Project not found" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Project Settings" description="Manage project configuration" />


      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        {/* General */}
        <Card className="animate-in">
          <CardHeader>
            <CardTitle>General</CardTitle>
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
              <label className="text-small text-text-secondary">Description</label>
              <textarea
                className="w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-3 text-text-primary placeholder:text-text-tertiary font-sans text-[0.9375rem] transition-all duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-glow)] focus:outline-none min-h-[80px] resize-y"
                placeholder="Brief description of your project"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Marketing Context */}
        <Card className="animate-in" style={{ animationDelay: "60ms" }}>
          <CardHeader>
            <CardTitle>Marketing Context</CardTitle>
            <p className="text-small text-text-secondary">
              This context is injected into AI prompts to personalize generated content.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-small text-text-secondary">Value Proposition</label>
              <textarea
                className="w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-3 text-text-primary placeholder:text-text-tertiary font-sans text-[0.9375rem] transition-all duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-glow)] focus:outline-none min-h-[80px] resize-y"
                placeholder="What makes your product uniquely valuable?"
                value={valueProposition}
                onChange={(e) => setValueProposition(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-small text-text-secondary">Positioning Statement</label>
              <textarea
                className="w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-3 text-text-primary placeholder:text-text-tertiary font-sans text-[0.9375rem] transition-all duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-glow)] focus:outline-none min-h-[80px] resize-y"
                placeholder="For [audience], [product] is the [category] that [benefit]..."
                value={positioningStatement}
                onChange={(e) => setPositioningStatement(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-small text-text-secondary">
                Target Audience <span className="text-text-tertiary">(JSON)</span>
              </label>
              <textarea
                className="w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-3 text-text-primary placeholder:text-text-tertiary font-mono text-[0.8125rem] transition-all duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-glow)] focus:outline-none min-h-[100px] resize-y"
                placeholder='{"personas": [{"role": "founder", "pain_points": ["..."]}]}'
                value={targetAudienceText}
                onChange={(e) => setTargetAudienceText(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-small text-text-secondary">
                Brand Voice <span className="text-text-tertiary">(JSON)</span>
              </label>
              <textarea
                className="w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-3 text-text-primary placeholder:text-text-tertiary font-mono text-[0.8125rem] transition-all duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-glow)] focus:outline-none min-h-[100px] resize-y"
                placeholder='{"tone": "professional", "dos": ["..."], "donts": ["..."]}'
                value={brandVoiceText}
                onChange={(e) => setBrandVoiceText(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-small text-text-secondary">
                Competitors <span className="text-text-tertiary">(JSON)</span>
              </label>
              <textarea
                className="w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-3 text-text-primary placeholder:text-text-tertiary font-mono text-[0.8125rem] transition-all duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-glow)] focus:outline-none min-h-[100px] resize-y"
                placeholder='[{"name": "Competitor", "url": "https://...", "strengths": ["..."]}]'
                value={competitorsText}
                onChange={(e) => setCompetitorsText(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-small text-text-secondary">
                Keywords <span className="text-text-tertiary">(JSON)</span>
              </label>
              <textarea
                className="w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-3 text-text-primary placeholder:text-text-tertiary font-mono text-[0.8125rem] transition-all duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-glow)] focus:outline-none min-h-[100px] resize-y"
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
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-accent" />
                Client Branding
              </CardTitle>
              <p className="text-small text-text-secondary">
                Customize PDF reports with your client&apos;s branding.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Client Name"
                placeholder="Acme Corp"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-small text-text-secondary">Client Logo</label>
                {clientLogoUrl && (
                  <div className="mb-2 p-3 rounded-lg border border-border-default bg-surface-1 inline-block">
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
                    variant="secondary"
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
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {uploadingLogo ? "Uploading..." : "Upload Logo"}
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
                <label className="text-small text-text-secondary">Report Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={reportAccentColor}
                    onChange={(e) => setReportAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border-strong cursor-pointer bg-transparent"
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
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="max-w-2xl mt-8">
        <Card className="animate-in border-error/20" style={{ animationDelay: "120ms" }}>
          <CardHeader>
            <CardTitle className="text-error">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <>
                <p className="text-body text-text-secondary mb-4">
                  Deleting this project will remove all campaigns, assets, and audit data.
                  This action cannot be undone.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Project
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg bg-error/5 border border-error/20 p-4">
                  <AlertTriangle className="h-5 w-5 text-error shrink-0 mt-0.5" />
                  <div>
                    <p className="text-body font-medium text-error">
                      Are you absolutely sure?
                    </p>
                    <p className="text-small text-text-secondary mt-1">
                      This will permanently delete <strong className="text-text-primary">{project.name}</strong> and
                      all associated data including audits, assets, and campaigns.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-small text-text-secondary mb-1.5 block">
                    Type <strong className="text-text-primary">{project.name}</strong> to confirm
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
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
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
