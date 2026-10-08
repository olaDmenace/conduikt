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
  X,
} from "@/src/components/ui/lucide-icons";
import { Button, IconButton } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { AGENT_REGISTRY } from "@/src/lib/ai/agents/registry";
import { agentDisplay } from "@/src/lib/ai/agents/display";
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
  const Icon = iconMap[data.icon] || Zap;
  // Category reads from the left rule, not a rainbow of border colours.
  const categoryColors: Record<string, string> = {
    analysis: "border-l-teal",
    creation: "border-l-accent",
    strategy: "border-l-line-strong",
    distribution: "border-l-text-3",
  };
  const borderClass = categoryColors[data.category] || "border-l-accent";

  return (
    <div
      className={`min-w-[180px] rounded-md border border-l-4 border-line bg-surface px-4 py-3 transition-colors ${borderClass} ${
        selected ? "ring-2 ring-accent ring-offset-2 ring-offset-ground" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-ground !bg-accent"
      />
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-text-3" />
        <div>
          <p className="text-title text-text">{data.label}</p>
          <p className="text-label text-text-3">{data.category}</p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-ground !bg-accent"
      />
    </div>
  );
}

function ActionNode({ data, selected }: NodeProps<Node<AgentNodeData>>) {
  const Icon = iconMap[data.icon] || Zap;
  return (
    <div
      className={`min-w-[160px] rounded-md border border-dashed border-line-strong bg-surface-2 px-4 py-3 transition-colors ${
        selected ? "ring-2 ring-accent ring-offset-2 ring-offset-ground" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-ground !bg-text-3"
      />
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-text-2" />
        <p className="text-body-s font-medium text-text-2">{data.label}</p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-ground !bg-text-3"
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
  const adjacency: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};

  for (const node of nodes) {
    adjacency[node.id] = [];
    inDegree[node.id] = 0;
  }
  for (const edge of edges) {
    adjacency[edge.source]?.push(edge.target);
    inDegree[edge.target] = (inDegree[edge.target] ?? 0) + 1;
  }

  const queue: string[] = [];
  for (const id of Object.keys(inDegree)) {
    if (inDegree[id] === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjacency[current] ?? []) {
      inDegree[neighbor] = (inDegree[neighbor] ?? 0) - 1;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
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
            style: { stroke: "var(--accent)", strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  // `stamp` (Date.now() at click time) keeps node ids unique.
  function addAgentNode(agentId: string, stamp: number) {
    const agent = AGENT_REGISTRY.find((a) => a.id === agentId);
    if (!agent) return;

    const newNode: Node = {
      id: `agent-${stamp}`,
      type: "agent",
      position: { x: 250, y: nodes.length * 120 + 50 },
      data: {
        label: agentDisplay(agent).name,
        agentId: agent.id,
        icon: agent.icon,
        category: agent.category,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setShowAgentPicker(false);
  }

  function addAction(actionId: string, stamp: number) {
    const action = actionNodes.find((a) => a.id === actionId);
    if (!action) return;

    const newNode: Node = {
      id: `action-${stamp}`,
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
      toast("Give the campaign a name first", "warning");
      return;
    }

    const steps = flowToSteps(nodes, edges);
    if (steps.length === 0) {
      toast("Add at least one agent first", "warning");
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
        toast("Campaign saved", "success");
        onCreated();
        onClose();
      } else {
        const err = await res.json();
        toast(err.error || "Couldn't save the campaign. Try again.", "error");
      }
    } catch {
      toast("Couldn't save the campaign. Try again.", "error");
    }
    setSaving(false);
  }

  const defaultEdgeOptions = useMemo(
    () => ({
      animated: true,
      style: { stroke: "var(--accent)", strokeWidth: 2 },
    }),
    []
  );

  return (
    <Card className="animate-in mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-text-3" />
            Build a campaign visually
          </CardTitle>
          <IconButton label="Close" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campaign name */}
        <label htmlFor="flow-campaign-name" className="sr-only">
          Campaign name
        </label>
        <input
          id="flow-campaign-name"
          type="text"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="Try: Spring launch"
          className="h-10 w-full rounded-md border border-line-strong bg-surface px-3.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAgentPicker(!showAgentPicker)}
            aria-expanded={showAgentPicker}
          >
            <Plus className="h-4 w-4" />
            Add agent
          </Button>
          {actionNodes.map((action) => {
            const Icon = getAgentIcon(action.icon);
            return (
              <Button
                key={action.id}
                variant="ghost"
                size="sm"
                onClick={() => addAction(action.id, Date.now())}
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
            {!saving && <Save className="h-4 w-4" />}
            {saving ? "Saving…" : "Save campaign"}
          </Button>
        </div>

        {/* Agent picker panel */}
        {showAgentPicker && (
          <div className="grid grid-cols-2 gap-2 rounded-md border border-line bg-ground p-3 sm:grid-cols-3 md:grid-cols-4">
            {availableAgents.map((agent) => {
              const Icon = getAgentIcon(agent.icon);
              return (
                <button
                  key={agent.id}
                  onClick={() => addAgentNode(agent.id, Date.now())}
                  className="flex items-center gap-2 rounded-md p-2.5 text-left text-body-s text-text-2 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] hover:bg-surface hover:text-text"
                >
                  <Icon className="h-4 w-4 shrink-0 text-text-3" />
                  <div>
                    <p className="font-medium">{agentDisplay(agent).name}</p>
                    <Badge variant="secondary" className="mt-0.5">
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
          className="overflow-hidden rounded-md border border-line"
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
            className="bg-ground"
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--line)"
            />
            <Controls
              className="!rounded-md !border-line !bg-surface-2 [&>button]:!border-line [&>button]:!bg-surface [&>button]:!text-text-2 [&>button:hover]:!bg-surface-2"
            />
            <MiniMap
              className="!rounded-md !border-line !bg-surface"
              nodeColor="var(--accent)"
              maskColor="color-mix(in srgb, var(--ink) 12%, transparent)"
            />
          </ReactFlow>
        </div>

        <p className="text-caption text-text-3">
          Drag the boxes to move them. Connect two agents by dragging from the dot
          at the bottom of one to the dot at the top of the next. Each agent uses
          what the last one made.
        </p>
      </CardContent>
    </Card>
  );
}
