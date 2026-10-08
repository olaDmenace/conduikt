"use client";

import { useEffect, useState, use } from "react";
import { Megaphone, Plus, Workflow } from "@/src/components/ui/lucide-icons";
import { PageHeader } from "@/src/components/layout/page-header";

import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Skeleton } from "@/src/components/ui/skeleton";
import { CampaignWizard } from "@/src/components/campaigns/campaign-wizard";
import { CampaignRunner } from "@/src/components/campaigns/campaign-runner";
import { CampaignFlowEditor } from "@/src/components/campaigns/campaign-flow-editor";

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
  const [showFlowEditor, setShowFlowEditor] = useState(false);

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
        description="Chain agents into one run. Each step uses what the last one made."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFlowEditor(true)}>
            <Workflow className="h-4 w-4" />
            Build visually
          </Button>
          <Button size="sm" onClick={() => setShowWizard(true)}>
            <Plus className="h-4 w-4" />
            New campaign
          </Button>
        </div>
      </PageHeader>

      {showFlowEditor && (
        <CampaignFlowEditor
          projectId={id}
          onClose={() => setShowFlowEditor(false)}
          onCreated={fetchCampaigns}
        />
      )}

      {showWizard && (
        <CampaignWizard
          projectId={id}
          onClose={() => setShowWizard(false)}
          onCreated={fetchCampaigns}
        />
      )}

      {loading ? (
        <div className="space-y-4" role="status" aria-label="Loading">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          className="animate-in"
          icon={<Megaphone className="h-6 w-6" />}
          title="No campaigns yet. Make one to chain agents together, so each step builds on the last."
          action={
            <Button size="sm" onClick={() => setShowWizard(true)}>
              <Plus className="h-4 w-4" />
              New campaign
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign, i) => (
            <div
              key={campaign.id}
              className="animate-in"
              style={{ animationDelay: `${Math.min(i, 5) * 80}ms` }}
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
