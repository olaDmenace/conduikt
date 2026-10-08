"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, CreditCard, Zap, Users, Webhook, Palette, Upload } from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";

interface BrandKit {
  brand_logo_url: string | null;
  brand_primary_color: string;
  brand_secondary_color: string;
  brand_font: string;
}

const settingsNav = [
  { name: "Profile", href: "/settings", icon: User, active: false },
  { name: "Billing", href: "/settings/billing", icon: CreditCard, active: false },
  { name: "Integrations", href: "/settings/integrations", icon: Zap, active: false },
  { name: "Team", href: "/settings/team", icon: Users, active: false },
  { name: "Brand kit", href: "/settings/brand", icon: Palette, active: true },
  { name: "Webhooks", href: "/settings/integrations/webhooks", icon: Webhook, active: false },
];

export default function BrandKitPage() {
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/settings/brand-kit")
      .then((r) => r.json())
      .then((data) => {
        setKit({
          brand_logo_url: data.brand_logo_url ?? null,
          brand_primary_color: data.brand_primary_color ?? "#D9663A",
          brand_secondary_color: data.brand_secondary_color ?? "#1A1A1A",
          brand_font: data.brand_font ?? "Outfit",
        });
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    if (!kit) return;
    setSaving(true);
    const res = await fetch("/api/settings/brand-kit", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kit),
    });
    setSaving(false);
    if (res.ok) {
      toast("Brand kit saved", "success");
    } else {
      const err = await res.json();
      toast(err.error ?? "We couldn't save your brand kit. Try again.", "error");
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !kit) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", "logos");
    fd.append("path", `brand/${Date.now()}`);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) {
      const { url } = await res.json();
      setKit({ ...kit, brand_logo_url: url });
      toast("Logo uploaded", "success");
    } else {
      const err = await res.json();
      toast(err.error ?? "The logo didn't upload. Try again.", "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Brand kit"
        description="Your logo and colours. We use them on text cards for social posts and on white-label PDF reports."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <nav className="lg:col-span-1" aria-label="Settings">
          <div className="flex gap-1 overflow-x-auto lg:flex-col">
            {settingsNav.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={`flex h-9 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] ${
                  item.active
                    ? "bg-ink text-ink-text"
                    : "text-text-2 hover:bg-surface-2 hover:text-text"
                }`}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

        <div className="space-y-6 lg:col-span-3">
          {loading || !kit ? (
            <div className="space-y-6" role="status" aria-label="Loading your brand kit">
              <div className="space-y-4 rounded-lg border border-line bg-surface p-4 md:p-6">
                <Skeleton className="h-5 w-20" />
                <div className="flex items-center gap-4">
                  <Skeleton className="h-20 w-20" />
                  <Skeleton className="h-8 w-28" />
                </div>
              </div>
              <div className="space-y-4 rounded-lg border border-line bg-surface p-4 md:p-6">
                <Skeleton className="h-5 w-24" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </div>
          ) : (
            <>
              <Card className="animate-in space-y-5">
                <div>
                  <h2 className="text-heading text-text">Logo</h2>
                  <p className="mt-1 text-body-s text-text-2">
                    PNG or SVG works best. We show it on text cards and PDF exports.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-line bg-ground">
                    {kit.brand_logo_url ? (
                      <Image
                        src={kit.brand_logo_url}
                        alt="Brand logo"
                        width={80}
                        height={80}
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <Palette className="h-6 w-6 text-text-3" aria-hidden />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                    >
                      {!uploading && <Upload className="h-4 w-4" />}
                      {uploading ? "Uploading…" : "Upload logo"}
                    </Button>
                    {kit.brand_logo_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setKit({ ...kit, brand_logo_url: null })}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="animate-in space-y-5" style={{ animationDelay: "60ms" }}>
                <div>
                  <h2 className="text-heading text-text">Colours</h2>
                  <p className="mt-1 text-body-s text-text-2">
                    Used as the accent and background on your text cards.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="brand-primary-hex" className="mb-1.5 block text-body-s text-text-2">
                      Primary (accent)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        aria-label="Pick primary colour"
                        value={kit.brand_primary_color}
                        onChange={(e) =>
                          setKit({ ...kit, brand_primary_color: e.target.value })
                        }
                        className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-line-strong bg-transparent"
                      />
                      <div className="flex-1">
                        <Input
                          id="brand-primary-hex"
                          value={kit.brand_primary_color}
                          onChange={(e) =>
                            setKit({ ...kit, brand_primary_color: e.target.value })
                          }
                          className="font-mono"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="brand-secondary-hex" className="mb-1.5 block text-body-s text-text-2">
                      Secondary (background)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        aria-label="Pick secondary colour"
                        value={kit.brand_secondary_color}
                        onChange={(e) =>
                          setKit({ ...kit, brand_secondary_color: e.target.value })
                        }
                        className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-line-strong bg-transparent"
                      />
                      <div className="flex-1">
                        <Input
                          id="brand-secondary-hex"
                          value={kit.brand_secondary_color}
                          onChange={(e) =>
                            setKit({ ...kit, brand_secondary_color: e.target.value })
                          }
                          className="font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="animate-in space-y-4" style={{ animationDelay: "120ms" }}>
                <h2 className="text-heading text-text">Preview</h2>
                {/* Colours here are the user's own brand values, not UI tokens. */}
                <div
                  className="relative flex aspect-square w-full max-w-xs flex-col justify-between overflow-hidden rounded-lg p-6"
                  style={{ background: kit.brand_secondary_color }}
                >
                  <div
                    className="absolute left-0 top-0 h-full w-1"
                    style={{ background: kit.brand_primary_color }}
                  />
                  <div
                    className="text-label"
                    style={{ color: kit.brand_primary_color }}
                  >
                    Your brand
                  </div>
                  <div className="text-xl font-medium leading-tight text-ink-text">
                    A quote or key insight from your post appears here.
                  </div>
                  <div
                    className="h-1 w-12 rounded-full"
                    style={{ background: kit.brand_primary_color }}
                  />
                </div>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save brand kit"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
