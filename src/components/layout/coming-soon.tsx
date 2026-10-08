"use client";

import { useState } from "react";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Bell, Check } from "@/src/components/ui/lucide-icons";
import type { LucideIcon } from "@/src/components/ui/lucide-icons";

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function ComingSoon({ icon: Icon, title, description }: ComingSoonProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="flex items-center justify-center py-16">
      <Card className="w-full max-w-md animate-in">
        <div className="flex flex-col items-center px-2 py-6 text-center">
          <Icon className="mb-4 h-6 w-6 text-text-3" aria-hidden />
          <span className="text-label text-text-3">Coming soon</span>
          <h2 className="mt-3 text-heading text-text">{title}</h2>
          <p className="mt-2 mb-8 text-body text-text-2">{description}</p>

          {submitted ? (
            <div className="flex items-center gap-2 text-body-s font-medium text-teal">
              <Check className="h-4 w-4" aria-hidden />
              We&apos;ll let you know when it&apos;s ready.
            </div>
          ) : (
            <div className="flex w-full items-end gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  label="Email"
                  hideLabel
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button
                onClick={() => {
                  if (email.trim()) setSubmitted(true);
                }}
                disabled={!email.trim()}
                className="h-10"
              >
                <Bell className="h-4 w-4" />
                Notify me
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
