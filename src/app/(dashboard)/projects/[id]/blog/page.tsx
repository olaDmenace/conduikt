"use client";

import { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  Copy,
  Check,
  Save,
  FileText,
  Twitter,
  Linkedin,
  Mail,
  Globe,
  Search,
  Image as ImageIcon,
  X as CloseIcon,
  ChevronRight,
  Download,
  Lock,
} from "@/src/components/ui/lucide-icons";
import { QuotaBadge } from "@/src/components/generation/quota-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button, IconButton } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Field, Input } from "@/src/components/ui/input";
import { Skeleton } from "@/src/components/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/src/components/ui/tabs";
import { PageHeader } from "@/src/components/layout/page-header";
import { ExpectationBanner } from "@/src/components/ui/expectation-banner";
import { SavedAssetsPanel } from "@/src/components/agents/saved-assets-panel";

import { useToast } from "@/src/components/ui/toast";
import { parseJsonResponse } from "@/src/lib/ai/parse-json";
import { PdfDownloadButton } from "@/src/components/ui/pdf-download-button";
import type { UnsplashPhoto } from "@/src/lib/integrations/unsplash";

// ---------- types ----------

interface BlogPost {
  meta_title: string;
  meta_description: string;
  slug: string;
  featured_image_query: string;
  content_markdown: string;
  word_count: number;
  reading_time_minutes: number;
  social_promotion: {
    x_post: string;
    linkedin_post: string;
    email_subject: string;
  };
}

interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

// ---------- component ----------

function BlogPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Inputs
  const [topic, setTopic] = useState(() => searchParams.get("topic") ?? "");
  const [targetKeyword, setTargetKeyword] = useState(() => searchParams.get("keyword") ?? "");
  const [wordCount, setWordCount] = useState(1500);
  const [tone, setTone] = useState("");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [rawResult, setRawResult] = useState("");
  const [parsed, setParsed] = useState<BlogPost | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");

  // Fetch user plan for save gating
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p) => setUserPlan(p?.plan ?? "free"))
      .catch(() => {});
  }, []);

  // Image picker state
  const [imagePhotos, setImagePhotos] = useState<UnsplashPhoto[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<UnsplashPhoto | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);

  // Copy states per field
  const [copied, setCopied] = useState<string | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(false);

  // Load saved blog post from ?assetId= param
  useEffect(() => {
    const assetId = searchParams.get("assetId");
    if (!assetId) return;
    setLoadingAsset(true);
    fetch(`/api/projects/${projectId}/assets/${assetId}`)
      .then((r) => r.json())
      .then((asset) => {
        const content = asset?.content as Record<string, unknown> | undefined;
        const parsedData = content?.parsed as BlogPost | undefined;
        if (parsedData?.meta_title) {
          setParsed(parsedData);
          setRawResult(typeof content?.raw === "string" ? content.raw : "");
          setTopic(typeof content?.prompt === "string" ? content.prompt : parsedData.meta_title);
          setSavedId(assetId);
        }
      })
      .catch(() => toast("Could not load saved blog post", "error"))
      .finally(() => setLoadingAsset(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast("Copied", "info");
    setTimeout(() => setCopied(null), 2000);
  }

  // Reset saved ID when topic changes
  useEffect(() => {
    setSavedId(null);
    setSelectedImage(null);
    setShowImagePicker(false);
  }, [topic]);

  async function fetchImages(query: string) {
    setImageLoading(true);
    setImagePhotos([]);
    try {
      const res = await fetch(`/api/blog/image?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.photos?.length) {
        setImagePhotos(data.photos);
        setShowImagePicker(true);
      } else {
        toast(data.error || "No images found. Try another search.", "warning");
      }
    } catch {
      toast("Image search failed. Try again.", "error");
    } finally {
      setImageLoading(false);
    }
  }

  async function selectImage(photo: UnsplashPhoto) {
    setSelectedImage(photo);
    setShowImagePicker(false);
    // Notify Unsplash (attribution requirement)
    await fetch("/api/blog/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ downloadLocation: photo.links.download_location }),
    });
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) {
      toast("Enter a topic for the blog post.", "warning");
      return;
    }

    setGenerating(true);
    setRawResult("");
    setParsed(null);
    setUsage(null);
    setSavedId(null);

    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: "blog-post",
          projectId,
          input: {
            topic,
            targetKeyword: targetKeyword || undefined,
            wordCount,
            tone: tone || undefined,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "Couldn't write the post. Try again.", "error");
        setGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        toast("Streaming not supported", "error");
        setGenerating(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));
          if (data.type === "text") {
            fullText += data.text;
            setRawResult(fullText);
          } else if (data.type === "done") {
            setUsage(data.usage);
          } else if (data.type === "error") {
            toast(data.error, "error");
          }
        }
      }

      // Parse JSON after stream completes
      try {
        const post = parseJsonResponse(fullText) as BlogPost;
        setParsed(post);
      } catch (parseErr) {
        console.warn("[blog] parse failed:", parseErr, "raw head:", fullText.slice(0, 300));
        toast("The post is written but the layout came out wrong. Open the raw text below.", "warning");
      }
    } catch {
      toast("Couldn't reach the writer. Try again.", "error");
    }

    setGenerating(false);
  }

  async function handleSave() {
    if (!parsed) return;
    setSaving(true);

    const res = await fetch(`/api/projects/${projectId}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "blog_post",
        channel: "web",
        title: parsed.meta_title || topic.slice(0, 100),
        content: {
          raw: rawResult,
          skill: "blog-post",
          prompt: topic,
          parsed,
          hero_image: selectedImage
            ? {
                url: selectedImage.urls.regular,
                thumb: selectedImage.urls.small,
                alt: selectedImage.alt_description,
                author: selectedImage.user.name,
                author_url: selectedImage.user.links.html,
              }
            : null,
        },
      }),
    });

    if (res.ok) {
      const saved = await res.json();
      setSavedId(saved.id);
      toast("Saved as a draft", "success");
    } else {
      toast("Couldn't save. Try again.", "error");
    }
    setSaving(false);
  }

  const wordCounts = [500, 800, 1200, 1500, 2000, 2500];

  return (
    <div>
      <PageHeader
        title="Blog"
        description="Full articles, ready to publish, with the text Google shows and posts to share them."
      />

      <ExpectationBanner
        storageKey="conduikt-expect-blog"
        message="One post won't move you up Google overnight. Posts build trust with Google over weeks as it finds and reads them."
        details={[
          "Post often. 2 to 4 posts a month helps Google see you as an expert faster.",
          "Share each post on social and by email to bring the first visitors.",
          "Refresh older posts every few months so they keep their place.",
        ]}
      />

      <div className="mb-6">
        <SavedAssetsPanel
          projectId={projectId}
          assetType="blog_post"
          title="Your saved blog posts"
          linkBuilder={(assetId) => `/projects/${projectId}/blog?assetId=${assetId}`}
          libraryHref={`/projects/${projectId}/library`}
          currentAssetId={savedId ?? undefined}
          emptyHint="Saved posts show up here. Press Save draft on any post to keep it."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ---- Left: Input Panel ---- */}
        <div className="lg:col-span-2">
          <Card className="animate-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-text-3" />
                What to write about
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <Field label="Topic or title" htmlFor="blog-topic">
                  <textarea
                    id="blog-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Try: How to plan a month of posts in one afternoon"
                    rows={3}
                    required
                    className="w-full resize-none rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  />
                </Field>

                <Input
                  label="Search phrase to rank for (optional)"
                  placeholder="Try: marketing automation for startups"
                  value={targetKeyword}
                  onChange={(e) => setTargetKeyword(e.target.value)}
                />

                <div>
                  <p className="mb-2 text-body-s text-text-2">
                    Length: <span className="font-mono text-text">{wordCount} words</span>
                  </p>
                  <div className="flex gap-2 flex-wrap" role="group" aria-label="Length">
                    {wordCounts.map((wc) => (
                      <button
                        key={wc}
                        type="button"
                        onClick={() => setWordCount(wc)}
                        aria-pressed={wordCount === wc}
                        className={`rounded-md border px-3 py-1.5 font-mono text-body-s transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] ${
                          wordCount === wc
                            ? "border-line-strong bg-surface-2 text-text"
                            : "border-line text-text-2 hover:bg-surface-2 hover:text-text"
                        }`}
                      >
                        {wc >= 1000 ? `${wc / 1000}k` : wc}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Tone (optional)"
                  placeholder="Try: friendly, for beginners"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={generating || !topic.trim()}
                >
                  {generating ? (
                    "Writing…"
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Write the post
                    </>
                  )}
                </Button>

                <QuotaBadge />
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ---- Right: Preview Panel ---- */}
        <div className="lg:col-span-3">
          <Card className="animate-in" style={{ animationDelay: "60ms" }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your post</CardTitle>
                {parsed && !generating && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {savedId && (
                      <Button size="sm" variant="outline" asChild>
                        <Link
                          href={`/projects/${projectId}/content?skill=social-content&prompt=${encodeURIComponent(`Promote this blog post: ${parsed.meta_title || topic}`)}`}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Write posts to share it
                        </Link>
                      </Button>
                    )}
                    {userPlan === "free" ? (
                      <Link href="/settings/billing">
                        <Button size="sm" variant="outline">
                          <Lock className="h-4 w-4" />
                          Upgrade to save
                        </Button>
                      </Link>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSave}
                          disabled={saving || !!savedId}
                        >
                          {saving ? null : savedId ? (
                            <Check className="h-4 w-4 text-teal" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          {saving ? "Saving…" : savedId ? "Saved" : "Save draft"}
                        </Button>
                        {savedId && (
                          <PdfDownloadButton
                            href={`/api/projects/${projectId}/assets/${savedId}/pdf`}
                            filename="blog-post.pdf"
                          />
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!rawResult && !generating ? (
                <EmptyState
                  icon={<FileText className="h-6 w-6" />}
                  title="Your post shows up here. Add a topic and press Write the post."
                />
              ) : generating && !parsed ? (
                <div className="rounded-md border border-line bg-ground p-6" role="status">
                  <p className="flex items-center gap-2 text-title text-text">
                    <span className="live-dot" aria-hidden />
                    Writing your blog post…
                  </p>
                  <p className="mt-2 text-body-s text-text-3">
                    We&apos;ll lay out the article, the text Google shows, and posts to share it once it&apos;s ready.
                  </p>
                  <div className="mt-5 space-y-2" aria-hidden>
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ) : parsed ? (
                <Tabs defaultValue="preview">
                  <TabsList>
                    <TabsTrigger value="preview">
                      <Globe className="h-3.5 w-3.5 mr-1.5" />
                      Article
                    </TabsTrigger>
                    <TabsTrigger value="seo">
                      <Search className="h-3.5 w-3.5 mr-1.5" />
                      On Google
                    </TabsTrigger>
                    <TabsTrigger value="social">
                      <Twitter className="h-3.5 w-3.5 mr-1.5" />
                      Share it
                    </TabsTrigger>
                  </TabsList>

                  {/* Article preview */}
                  <TabsContent value="preview">
                    <div className="max-h-[600px] overflow-hidden overflow-y-auto rounded-md border border-line bg-ground">
                      {/* Hero image area */}
                      {selectedImage ? (
                        <div className="relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedImage.urls.regular}
                            alt={selectedImage.alt_description || parsed.meta_title}
                            className="w-full h-48 object-cover"
                          />
                          <div className="absolute right-2 top-2 flex items-center gap-2 opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100 group-focus-within:opacity-100">
                            <Button
                              size="sm"
                              variant="quiet"
                              onClick={() => fetchImages(parsed.featured_image_query)}
                            >
                              Change image
                            </Button>
                            <IconButton
                              label="Remove image"
                              size="sm"
                              variant="quiet"
                              onClick={() => setSelectedImage(null)}
                            >
                              <CloseIcon className="h-3.5 w-3.5" />
                            </IconButton>
                          </div>
                          {/* Attribution */}
                          <a
                            href={`${selectedImage.user.links.html}?utm_source=conduikt&utm_medium=referral`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-2 right-2 rounded-sm bg-overlay px-1.5 py-0.5 text-caption text-on-photo"
                          >
                            Photo by {selectedImage.user.name} on Unsplash
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-5 pt-4">
                          {parsed.featured_image_query && (
                            <button
                              onClick={() => fetchImages(parsed.featured_image_query)}
                              disabled={imageLoading}
                              className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-body-s text-text-2 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] hover:bg-surface-2 hover:text-text disabled:opacity-50"
                            >
                              {!imageLoading && <ImageIcon className="h-3.5 w-3.5" />}
                              {imageLoading ? "Searching…" : `Find a header image: "${parsed.featured_image_query}"`}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Image picker grid */}
                      {showImagePicker && imagePhotos.length > 0 && (
                        <div className="mx-5 mt-3 mb-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-body-s text-text-3">Pick a header image</p>
                            <IconButton
                              label="Close image picker"
                              size="sm"
                              onClick={() => setShowImagePicker(false)}
                            >
                              <CloseIcon className="h-3.5 w-3.5" />
                            </IconButton>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {imagePhotos.map((photo) => (
                              <button
                                key={photo.id}
                                onClick={() => selectImage(photo)}
                                className="relative aspect-video overflow-hidden rounded-md border border-line transition-colors duration-[var(--duration-fast)] hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photo.urls.small}
                                  alt={photo.alt_description || ""}
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-line">
                          <Badge variant="secondary">
                            ~{parsed.word_count?.toLocaleString() ?? "?"} words
                          </Badge>
                          <Badge variant="secondary">
                            {parsed.reading_time_minutes ?? "?"} min read
                          </Badge>
                        </div>
                        <div className="prose-conduikt">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {parsed.content_markdown}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* SEO Meta */}
                  <TabsContent value="seo">
                    <div className="space-y-4">
                      {/* SERP preview */}
                      <div className="rounded-md border border-line bg-ground p-5">
                        <p className="mb-3 text-label text-text-3">How it shows on Google</p>
                        <p className="mb-1 text-title text-accent-hover">
                          {parsed.meta_title}
                        </p>
                        <p className="mb-1 font-mono text-caption text-teal">
                          {`https://yoursite.com/blog/${parsed.slug}`}
                        </p>
                        <p className="text-body-s text-text-2">
                          {parsed.meta_description}
                        </p>
                      </div>

                      {/* Meta fields */}
                      <div className="space-y-3">
                        {[
                          { label: "Title on Google", value: parsed.meta_title, limit: 60, key: "title" },
                          { label: "Description on Google", value: parsed.meta_description, limit: 160, key: "desc" },
                          { label: "Web address", value: parsed.slug, limit: null, key: "slug" },
                        ].map((field) => (
                          <div key={field.key} className="rounded-md border border-line bg-ground p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-label text-text-3">
                                {field.label}
                              </span>
                              <div className="flex items-center gap-2">
                                {field.limit && (
                                  <Badge
                                    variant={field.value.length <= field.limit ? "success" : "error"}
                                  >
                                    {field.value.length}/{field.limit}
                                  </Badge>
                                )}
                                <IconButton
                                  label={`Copy ${field.label.toLowerCase()}`}
                                  size="sm"
                                  onClick={() => copy(field.value, field.key)}
                                >
                                  {copied === field.key ? (
                                    <Check className="h-3.5 w-3.5 text-teal" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </IconButton>
                              </div>
                            </div>
                            <p className="text-body-s text-text font-mono">{field.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Social Promotion */}
                  <TabsContent value="social">
                    <div className="space-y-3">
                      {[
                        {
                          key: "x",
                          label: "X",
                          icon: Twitter,
                          text: parsed.social_promotion?.x_post ?? "",
                          limit: 280,
                        },
                        {
                          key: "linkedin",
                          label: "LinkedIn",
                          icon: Linkedin,
                          text: parsed.social_promotion?.linkedin_post ?? "",
                          limit: 700,
                        },
                        {
                          key: "email",
                          label: "Email subject",
                          icon: Mail,
                          text: parsed.social_promotion?.email_subject ?? "",
                          limit: null,
                        },
                      ].map((item) => (
                        <div key={item.key} className="rounded-md border border-line bg-ground p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <item.icon className="h-4 w-4 text-text-3" />
                              <span className="text-label text-text-3">
                                {item.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.limit && (
                                <Badge
                                  variant={item.text.length <= item.limit ? "success" : "error"}
                                >
                                  {item.text.length}/{item.limit}
                                </Badge>
                              )}
                              <IconButton
                                label={`Copy ${item.label} text`}
                                size="sm"
                                onClick={() => copy(item.text, item.key)}
                              >
                                {copied === item.key ? (
                                  <Check className="h-3.5 w-3.5 text-teal" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </IconButton>
                            </div>
                          </div>
                          <p className="text-body-s text-text whitespace-pre-line">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                </Tabs>
              ) : !generating && rawResult ? (
                <div className="space-y-2 rounded-md border border-line bg-accent-soft p-6">
                  <p className="text-title text-text">
                    The post came back but we couldn&apos;t lay it out as an article. Try again.
                  </p>
                  <details className="text-body-s">
                    <summary className="cursor-pointer text-text-3 hover:text-text">
                      Show raw output
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-caption text-text-2 font-mono break-words max-h-[320px] overflow-y-auto">
                      {rawResult}
                    </pre>
                  </details>
                </div>
              ) : null}

              {/* Usage stats */}
              {usage && (
                <p className="mt-4 font-mono text-caption text-text-3">
                  Written in {(usage.durationMs / 1000).toFixed(1)}s
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function BlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="space-y-6" role="status" aria-label="Loading"><Skeleton className="h-10 w-48" /><Skeleton className="h-96" /></div>}>
      <BlogPageInner params={params} />
    </Suspense>
  );
}
