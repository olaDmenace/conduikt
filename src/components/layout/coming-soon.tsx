"use client";

import { useState } from "react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Bell, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
      <Card className="max-w-md w-full animate-in">
        <CardContent className="flex flex-col items-center text-center py-12 px-8">
          <div className="mb-6 rounded-2xl bg-surface-2 p-4">
            <Icon className="h-10 w-10 text-text-tertiary" />
          </div>
          <h2 className="text-h2 text-text-primary mb-2">{title}</h2>
          <p className="text-body text-text-secondary mb-8">{description}</p>

          {submitted ? (
            <div className="flex items-center gap-2 text-success text-small font-medium">
              <Check className="h-4 w-4" />
              We&apos;ll let you know when it&apos;s ready!
            </div>
          ) : (
            <div className="flex w-full gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (email.trim()) setSubmitted(true);
                }}
                disabled={!email.trim()}
              >
                <Bell className="h-4 w-4" />
                Notify Me
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
