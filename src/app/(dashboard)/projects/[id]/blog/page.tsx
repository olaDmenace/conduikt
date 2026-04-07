"use client";

import { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Save,
  FileText,
  Twitter,
  Linkedin,
  Mail,
  Globe,
  Zap,
  Image as ImageIcon,
  X as CloseIcon,
  ChevronRight,
  Download,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/src/components/ui/tabs";
import { PageHeader } from "@/src/components/layout/page-header";
import { ExpectationBanner } from "@/src/components/ui/expectation-banner";

import { useToast } from "@/src/components/ui/toast";
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
  const [topic, setTopic] = useState("");
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
    toast("Copied!", "info");
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
        toast(data.error || "No images found", "warning");
      }
    } catch {
      toast("Image search failed", "error");
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
        toast(err.error || "Generation failed", "error");
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
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        const post = JSON.parse(jsonMatch?.[0] ?? fullText) as BlogPost;
        setParsed(post);
      } catch {
        toast("Could not parse blog post output — check Raw tab", "warning");
      }
    } catch {
      toast("Failed to connect to AI service", "error");
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
      toast("Blog post saved as draft!", "success");
    } else {
      toast("Failed to save", "error");
    }
    setSaving(false);
  }

  const wordCounts = [500, 800, 1200, 1500, 2000, 2500];

  return (
    <div>
      <PageHeader
        title="Blog Post Generator"
        description="Generate SEO-optimized long-form content with meta tags and social promotion snippets"
      />


      <ExpectationBanner
        storageKey="conduikt-expect-blog"
        message="A single blog post won't transform your rankings overnight. SEO-optimized content builds authority over weeks as search engines crawl and index it."
        details={[
          "Publish consistently — 2-4 posts per month builds topical authority faster.",
          "Promote each post on social media and email to generate initial traffic signals.",
          "Update and refresh older posts every few months to maintain rankings.",
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ---- Left: Input Panel ---- */}
        <div className="lg:col-span-2">
          <Card className="animate-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Post Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="text-small text-text-secondary block mb-1.5">
                    Topic / Title *
                  </label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. How to automate your marketing with AI in 2025"
                    rows={3}
                    className="w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-3 text-text-primary placeholder:text-text-tertiary font-sans text-[0.9375rem] transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)] resize-none"
                  />
                </div>

                <Input
                  label="Target Keyword (optional)"
                  placeholder="e.g. marketing automation for startups"
                  value={targetKeyword}
                  onChange={(e) => setTargetKeyword(e.target.value)}
                />

                <div>
                  <label className="text-small text-text-secondary block mb-2">
                    Word Count: <span className="text-accent font-mono">{wordCount}</span>
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {wordCounts.map((wc) => (
                      <button
                        key={wc}
                        type="button"
                        onClick={() => setWordCount(wc)}
                        className={`rounded-lg border px-3 py-1.5 text-small font-medium transition-all ${
                          wordCount === wc
                            ? "border-accent bg-accent-muted text-accent"
                            : "border-border-default text-text-secondary hover:border-border-strong hover:text-text-primary"
                        }`}
                      >
                        {wc >= 1000 ? `${wc / 1000}k` : wc}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Tone (optional)"
                  placeholder="e.g. conversational, authoritative, beginner-friendly"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={generating || !topic.trim()}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Writing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Blog Post
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ---- Right: Preview Panel ---- */}
        <div className="lg:col-span-3">
          <Card className="animate-in" style={{ animationDelay: "60ms" }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview</CardTitle>
                {parsed && !generating && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {savedId && (
                      <Link
                        href={`/projects/${projectId}/content?skill=social-content&prompt=${encodeURIComponent(`Promote this blog post: ${parsed.meta_title || topic}`)}`}
                        className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent-muted px-3 py-1.5 text-small font-medium text-accent hover:bg-accent/20 transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate Social Posts
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleSave}
                      disabled={saving || !!savedId}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : savedId ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saving ? "Saving..." : savedId ? "Saved" : "Save Draft"}
                    </Button>
                    {savedId && (
                      <PdfDownloadButton
                        href={`/api/projects/${projectId}/assets/${savedId}/pdf`}
                        filename="blog-post.pdf"
                      />
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!rawResult && !generating ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <FileText className="h-10 w-10 text-text-tertiary mb-4" />
                  <p className="text-body text-text-secondary">
                    Your blog post will preview here
                  </p>
                  <p className="text-small text-text-tertiary mt-1">
                    Fill in the topic and click Generate
                  </p>
                </div>
              ) : generating && !parsed ? (
                // Streaming: show raw text building
                <div>
                  <div className="flex items-center gap-2 text-small text-accent mb-3">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Writing your blog post...
                  </div>
                  <div className="rounded-xl border border-border-default bg-surface-0 p-4 max-h-[400px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-small text-text-tertiary font-mono break-words">
                      {rawResult}
                    </pre>
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
                      <Zap className="h-3.5 w-3.5 mr-1.5" />
                      SEO Meta
                    </TabsTrigger>
                    <TabsTrigger value="social">
                      <Twitter className="h-3.5 w-3.5 mr-1.5" />
                      Promote
                    </TabsTrigger>
                    <TabsTrigger value="raw">
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      Raw
                    </TabsTrigger>
                  </TabsList>

                  {/* Article preview */}
                  <TabsContent value="preview">
                    <div className="rounded-xl border border-border-default bg-surface-0 overflow-hidden max-h-[600px] overflow-y-auto">
                      {/* Hero image area */}
                      {selectedImage ? (
                        <div className="relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedImage.urls.regular}
                            alt={selectedImage.alt_description || parsed.meta_title}
                            className="w-full h-48 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => fetchImages(parsed.featured_image_query)}
                              className="rounded-lg bg-surface-1/90 px-3 py-1.5 text-small text-text-primary hover:bg-surface-2 transition-colors"
                            >
                              Change image
                            </button>
                            <button
                              onClick={() => setSelectedImage(null)}
                              className="rounded-lg bg-surface-1/90 p-1.5 text-text-primary hover:bg-surface-2 transition-colors"
                            >
                              <CloseIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {/* Attribution */}
                          <a
                            href={`${selectedImage.user.links.html}?utm_source=conduikt&utm_medium=referral`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-2 right-2 text-[10px] text-white/70 bg-black/40 px-1.5 py-0.5 rounded hover:text-white/100 transition-colors"
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
                              className="flex items-center gap-2 rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-small text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors"
                            >
                              {imageLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ImageIcon className="h-3.5 w-3.5" />
                              )}
                              {imageLoading ? "Searching…" : `Find hero image: "${parsed.featured_image_query}"`}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Image picker grid */}
                      {showImagePicker && imagePhotos.length > 0 && (
                        <div className="mx-5 mt-3 mb-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-small text-text-tertiary">Select a hero image</p>
                            <button
                              onClick={() => setShowImagePicker(false)}
                              className="p-1 text-text-tertiary hover:text-text-primary"
                            >
                              <CloseIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {imagePhotos.map((photo) => (
                              <button
                                key={photo.id}
                                onClick={() => selectImage(photo)}
                                className="group relative rounded-lg overflow-hidden border-2 border-transparent hover:border-accent transition-all aspect-video"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photo.urls.small}
                                  alt={photo.alt_description || ""}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border-subtle">
                          <Badge variant="secondary">
                            ~{parsed.word_count?.toLocaleString() ?? "—"} words
                          </Badge>
                          <Badge variant="secondary">
                            {parsed.reading_time_minutes ?? "—"} min read
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
                      <div className="rounded-xl border border-border-default bg-surface-0 p-5">
                        <p className="text-small text-text-tertiary mb-3">SERP Preview</p>
                        <p className="text-accent text-body font-medium leading-tight mb-1">
                          {parsed.meta_title}
                        </p>
                        <p className="text-small text-success text-[0.75rem] mb-1">
                          {`https://yoursite.com/blog/${parsed.slug}`}
                        </p>
                        <p className="text-small text-text-secondary">
                          {parsed.meta_description}
                        </p>
                      </div>

                      {/* Meta fields */}
                      <div className="space-y-3">
                        {[
                          { label: "Meta Title", value: parsed.meta_title, limit: 60, key: "title" },
                          { label: "Meta Description", value: parsed.meta_description, limit: 160, key: "desc" },
                          { label: "URL Slug", value: parsed.slug, limit: null, key: "slug" },
                        ].map((field) => (
                          <div key={field.key} className="rounded-lg border border-border-default bg-surface-0 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-small font-medium text-text-secondary">
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
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copy(field.value, field.key)}
                                >
                                  {copied === field.key ? (
                                    <Check className="h-3.5 w-3.5 text-success" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <p className="text-small text-text-primary font-mono">{field.value}</p>
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
                          label: "X (Twitter)",
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
                          label: "Email Subject",
                          icon: Mail,
                          text: parsed.social_promotion?.email_subject ?? "",
                          limit: null,
                        },
                      ].map((item) => (
                        <div key={item.key} className="rounded-xl border border-border-default bg-surface-0 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <item.icon className="h-4 w-4 text-text-secondary" />
                              <span className="text-small font-medium text-text-secondary">
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
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copy(item.text, item.key)}
                              >
                                {copied === item.key ? (
                                  <Check className="h-3.5 w-3.5 text-success" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <p className="text-small text-text-primary whitespace-pre-line">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Raw JSON */}
                  <TabsContent value="raw">
                    <div className="rounded-xl border border-border-default bg-surface-0 p-4 max-h-[500px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-small text-text-primary font-mono break-words">
                        {rawResult}
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : null}

              {/* Usage stats */}
              {usage && (
                <div className="flex items-center gap-3 text-small text-text-tertiary mt-4">
                  <Badge variant="secondary">
                    <Zap className="h-3 w-3 mr-1" />
                    {(usage.inputTokens + usage.outputTokens).toLocaleString()} tokens
                  </Badge>
                  <span>{(usage.durationMs / 1000).toFixed(1)}s</span>
                </div>
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
    <Suspense fallback={<div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>}>
      <BlogPageInner params={params} />
    </Suspense>
  );
}
