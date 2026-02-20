"use client";

import { useEffect, useState, use } from "react";
import { Megaphone, Plus, Loader2 } from "lucide-react";
import { PageHeader } from "@/src/components/layout/page-header";
import { ProjectNav } from "@/src/components/layout/project-nav";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { CampaignWizard } from "@/src/components/campaigns/campaign-wizard";
import { CampaignRunner } from "@/src/components/campaigns/campaign-runner";

interface CampaignStep {
  id: string;
  step_order: number;
  agent_id: string;
  status: string;
  result: unknown;
  started_at: string | null;
  completed_at: string | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  created_at: string;
  campaign_steps: CampaignStep[];
}

export default function CampaignsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, [id]);

  async function fetchCampaigns() {
    const res = await fetch(`/api/projects/${id}/campaigns`);
    if (res.ok) {
      const data = await res.json();
      setCampaigns(data);
    }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Multi-step AI campaign orchestration"
      >
        <Button size="sm" onClick={() => setShowWizard(true)}>
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </PageHeader>

      <ProjectNav projectId={id} />

      {showWizard && (
        <CampaignWizard
          projectId={id}
          onClose={() => setShowWizard(false)}
          onCreated={fetchCampaigns}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="border-dashed border-border-strong animate-in">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 rounded-xl bg-accent-muted p-4">
              <Megaphone className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-h2 text-text-primary">No campaigns yet</h3>
            <p className="mt-2 max-w-md text-body text-text-secondary">
              Create your first campaign to chain AI agents together.
              Each step&apos;s output feeds into the next for a complete
              marketing pipeline.
            </p>
            <Button
              className="mt-6"
              size="sm"
              onClick={() => setShowWizard(true)}
            >
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign, i) => (
            <div
              key={campaign.id}
              className="animate-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <CampaignRunner
                campaign={campaign}
                projectId={id}
                onUpdate={fetchCampaigns}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
