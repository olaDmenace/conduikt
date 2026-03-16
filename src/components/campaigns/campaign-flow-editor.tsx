"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Search,
  Target,
  FileText,
  Twitter,
  Mail,
  Globe,
  Map,
  Crosshair,
  Zap,
  Play,
  Clock,
  Plus,
  Trash2,
  Save,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { AGENT_REGISTRY } from "@/src/lib/ai/agents/registry";
import { useToast } from "@/src/components/ui/toast";

// ---------- icon map ----------

const iconMap: Record<string, React.ElementType> = {
  Search, Target, FileText, Twitter, Mail, Globe, Map, Crosshair, Zap, Play, Clock,
};

function getAgentIcon(iconName: string) {
  return iconMap[iconName] || Zap;
}

// ---------- custom node types ----------

interface AgentNodeData {
  label: string;
  agentId: string;
  icon: string;
  category: string;
  [key: string]: unknown;
}

function AgentNode({ data, selected }: NodeProps<Node<AgentNodeData>>) {
  const Icon = getAgentIcon(data.icon);
  const categoryColors: Record<string, string> = {
    analysis: "border-blue-500/50",
    creation: "border-accent/50",
    strategy: "border-emerald-500/50",
    distribution: "border-violet-500/50",
  };
  const borderClass = categoryColors[data.category] || "border-accent/50";

  return (
    <div
      className={`rounded-xl border-2 bg-surface-1 px-4 py-3 min-w-[180px] shadow-lg transition-all ${borderClass} ${
        selected ? "ring-2 ring-accent ring-offset-2 ring-offset-surface-0" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-accent !border-2 !border-surface-0"
      />
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-surface-2 p-1.5">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-small font-semibold text-text-primary">{data.label}</p>
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">
            {data.category}
          </p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-accent !border-2 !border-surface-0"
      />
    </div>
  );
}

function ActionNode({ data, selected }: NodeProps<Node<AgentNodeData>>) {
  const Icon = getAgentIcon(data.icon);
  return (
    <div
      className={`rounded-xl border-2 border-dashed border-text-tertiary/30 bg-surface-2 px-4 py-3 min-w-[160px] shadow-lg transition-all ${
        selected ? "ring-2 ring-accent ring-offset-2 ring-offset-surface-0" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-text-tertiary !border-2 !border-surface-0"
      />
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-text-secondary" />
        <p className="text-small font-medium text-text-secondary">{data.label}</p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-text-tertiary !border-2 !border-surface-0"
      />
    </div>
  );
}

const nodeTypes = {
  agent: AgentNode,
  action: ActionNode,
};

// ---------- helpers ----------

const availableAgents = AGENT_REGISTRY.filter(
  (a) => a.status === "active" && a.id !== "campaigns"
);

const actionNodes = [
  { id: "publish", label: "Publish", icon: "Play" },
  { id: "schedule", label: "Schedule", icon: "Clock" },
  { id: "wait", label: "Wait", icon: "Clock" },
];

function flowToSteps(nodes: Node[], edges: Edge[]) {
  // Topological sort based on edges
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) - 1);
      if (inDegree.get(neighbor) === 0) queue.push(neighbor);
    }
  }

  return sorted
    .map((nodeId, i) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.type !== "agent") return null;
      return {
        agent_id: (node.data as AgentNodeData).agentId,
        step_order: i + 1,
        config: {},
      };
    })
    .filter(Boolean);
}

// ---------- component ----------

interface CampaignFlowEditorProps {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  campaignName?: string;
}

export function CampaignFlowEditor({
  projectId,
  onClose,
  onCreated,
  initialNodes,
  initialEdges,
  campaignName: initialName,
}: CampaignFlowEditorProps) {
  const { toast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges ?? []);
  const [campaignName, setCampaignName] = useState(initialName || "");
  const [saving, setSaving] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: "#D4945A", strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  function addAgentNode(agentId: string) {
    const agent = AGENT_REGISTRY.find((a) => a.id === agentId);
    if (!agent) return;

    const newNode: Node = {
      id: `agent-${Date.now()}`,
      type: "agent",
      position: { x: 250, y: nodes.length * 120 + 50 },
      data: {
        label: agent.shortName,
        agentId: agent.id,
        icon: agent.icon,
        category: agent.category,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setShowAgentPicker(false);
  }

  function addAction(actionId: string) {
    const action = actionNodes.find((a) => a.id === actionId);
    if (!action) return;

    const newNode: Node = {
      id: `action-${Date.now()}`,
      type: "action",
      position: { x: 250, y: nodes.length * 120 + 50 },
      data: {
        label: action.label,
        agentId: actionId,
        icon: action.icon,
        category: "action",
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }

  function deleteSelected() {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) =>
      eds.filter((e) => {
        const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
        return !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target);
      })
    );
  }

  async function handleSave() {
    if (!campaignName.trim()) {
      toast("Enter a campaign name", "warning");
      return;
    }

    const steps = flowToSteps(nodes, edges);
    if (steps.length === 0) {
      toast("Add at least one agent node to the flow", "warning");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName.trim(),
          steps,
        }),
      });

      if (res.ok) {
        toast("Campaign created!", "success");
        onCreated();
        onClose();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to create campaign", "error");
      }
    } catch {
      toast("Failed to create campaign", "error");
    }
    setSaving(false);
  }

  const defaultEdgeOptions = useMemo(
    () => ({
      animated: true,
      style: { stroke: "#D4945A", strokeWidth: 2 },
    }),
    []
  );

  return (
    <Card className="animate-in mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" />
            Visual Campaign Builder
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campaign name */}
        <input
          type="text"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="Campaign name..."
          className="w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-2.5 text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
        />

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAgentPicker(!showAgentPicker)}
          >
            <Plus className="h-4 w-4" />
            Add Agent
          </Button>
          {actionNodes.map((action) => {
            const Icon = getAgentIcon(action.icon);
            return (
              <Button
                key={action.id}
                variant="ghost"
                size="sm"
                onClick={() => addAction(action.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            );
          })}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={deleteSelected}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Campaign"}
          </Button>
        </div>

        {/* Agent picker panel */}
        {showAgentPicker && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3 rounded-lg border border-border-default bg-surface-2">
            {availableAgents.map((agent) => {
              const Icon = getAgentIcon(agent.icon);
              return (
                <button
                  key={agent.id}
                  onClick={() => addAgentNode(agent.id)}
                  className="flex items-center gap-2 rounded-lg p-2.5 text-left text-small text-text-secondary hover:bg-surface-1 hover:text-text-primary transition-colors"
                >
                  <Icon className="h-4 w-4 text-accent shrink-0" />
                  <div>
                    <p className="font-medium">{agent.shortName}</p>
                    <Badge variant="secondary" className="mt-0.5 text-[9px]">
                      {agent.category}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Flow canvas */}
        <div
          className="rounded-xl border border-border-default overflow-hidden"
          style={{ height: 500 }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            className="bg-surface-0"
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#5E5A5420"
            />
            <Controls
              className="!bg-surface-2 !border-border-default !rounded-lg !shadow-lg [&>button]:!bg-surface-1 [&>button]:!border-border-default [&>button]:!text-text-secondary [&>button:hover]:!bg-surface-2"
            />
            <MiniMap
              className="!bg-surface-1 !border-border-default !rounded-lg"
              nodeColor="#D4945A"
              maskColor="rgba(12, 12, 14, 0.8)"
            />
          </ReactFlow>
        </div>

        <p className="text-[11px] text-text-tertiary">
          Drag nodes to position them. Connect agents by dragging from an output handle (bottom) to an input handle (top).
          Each agent&apos;s output feeds into the next as context.
        </p>
      </CardContent>
    </Card>
  );
}
