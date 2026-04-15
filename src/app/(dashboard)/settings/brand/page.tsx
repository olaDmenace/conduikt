"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, CreditCard, Zap, Users, Loader2, Webhook, Palette, Upload } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
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
  { name: "Brand Kit", href: "/settings/brand", icon: Palette, active: true },
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
          brand_primary_color: data.brand_primary_color ?? "#D4945A",
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
      toast(err.error ?? "Failed to save", "error");
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
      toast(err.error ?? "Upload failed", "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Brand Kit"
        description="Your logo and colors — used for overlay text cards on social posts and white-label PDF reports."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <nav className="lg:col-span-1">
          <div className="space-y-1">
            {settingsNav.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-small font-medium transition-colors ${
                  item.active
                    ? "bg-accent-muted text-accent"
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

        <div className="lg:col-span-3 space-y-6">
          {loading || !kit ? (
            <Card>
              <CardContent className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 text-accent animate-spin" />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="animate-in">
                <CardContent className="space-y-5 p-6">
                  <div>
                    <h2 className="text-h3 text-text-primary">Logo</h2>
                    <p className="text-small text-text-secondary mt-1">
                      PNG or SVG recommended. Shown on overlay cards and PDF exports.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-lg border border-border-default bg-surface-2 flex items-center justify-center overflow-hidden">
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
                        <Palette className="h-6 w-6 text-text-tertiary" />
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
                        variant="secondary"
                        size="sm"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {uploading ? "Uploading..." : "Upload logo"}
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
                </CardContent>
              </Card>

              <Card className="animate-in" style={{ animationDelay: "60ms" }}>
                <CardContent className="space-y-5 p-6">
                  <div>
                    <h2 className="text-h3 text-text-primary">Colors</h2>
                    <p className="text-small text-text-secondary mt-1">
                      Used as accent and background on generated overlay cards.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-small text-text-secondary mb-1.5 block">
                        Primary (accent)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={kit.brand_primary_color}
                          onChange={(e) =>
                            setKit({ ...kit, brand_primary_color: e.target.value })
                          }
                          className="h-10 w-12 rounded border border-border-default bg-transparent cursor-pointer"
                        />
                        <Input
                          value={kit.brand_primary_color}
                          onChange={(e) =>
                            setKit({ ...kit, brand_primary_color: e.target.value })
                          }
                          className="flex-1 font-mono text-data"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-small text-text-secondary mb-1.5 block">
                        Secondary (background)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={kit.brand_secondary_color}
                          onChange={(e) =>
                            setKit({ ...kit, brand_secondary_color: e.target.value })
                          }
                          className="h-10 w-12 rounded border border-border-default bg-transparent cursor-pointer"
                        />
                        <Input
                          value={kit.brand_secondary_color}
                          onChange={(e) =>
                            setKit({ ...kit, brand_secondary_color: e.target.value })
                          }
                          className="flex-1 font-mono text-data"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-in" style={{ animationDelay: "120ms" }}>
                <CardContent className="space-y-4 p-6">
                  <h2 className="text-h3 text-text-primary">Preview</h2>
                  <div
                    className="aspect-square w-full max-w-xs rounded-lg overflow-hidden flex flex-col justify-between p-6 relative"
                    style={{ background: kit.brand_secondary_color }}
                  >
                    <div
                      className="absolute left-0 top-0 h-full w-1"
                      style={{ background: kit.brand_primary_color }}
                    />
                    <div
                      className="text-xs uppercase tracking-widest font-semibold"
                      style={{ color: kit.brand_primary_color }}
                    >
                      Your Brand
                    </div>
                    <div
                      className="text-xl font-medium leading-tight"
                      style={{ color: "#E8E4DE" }}
                    >
                      A quote or key insight from your post appears here.
                    </div>
                    <div
                      className="h-1 w-12 rounded-full"
                      style={{ background: kit.brand_primary_color }}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {saving ? "Saving..." : "Save Brand Kit"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
