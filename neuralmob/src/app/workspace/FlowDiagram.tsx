"use client";

import type { FlowConfig, ModelConfig } from "@/lib/types";
import { modelLabel } from "@/lib/constants";

const W = 264;
const NW = 78; // node width
const NH = 36; // node height
const NR = 7;  // border radius

// Fixed X centres for the 3 bot columns
const BX = [40, 132, 224];

type NType = "bot" | "merge" | "out";

interface N {
  id: string;
  cx: number;
  cy: number;
  label: string;
  sub: string;
  type: NType;
  active: boolean;
}

interface E {
  from: string;
  to: string;
  dashed?: boolean;
}

function cubicPath(x1: number, y1: number, x2: number, y2: number): string {
  const sy = y1 + NH / 2 + 2;
  const ey = y2 - NH / 2 - 6; // leave space for arrowhead
  const my = (sy + ey) / 2;
  return `M ${x1} ${sy} C ${x1} ${my}, ${x2} ${my}, ${x2} ${ey}`;
}

function buildLayout(flow: FlowConfig, models: ModelConfig): { nodes: N[]; edges: E[]; svgH: number } {
  const nodes: N[] = [];
  const edges: E[] = [];

  /* ── QUICK MODE ── */
  if (flow.mode === "quick") {
    const m = models[flow.primarySlot];
    nodes.push({ id: "q", cx: W / 2, cy: 26, label: modelLabel(m), sub: "quick", type: "bot", active: true });
    nodes.push({ id: "out", cx: W / 2, cy: 110, label: "Output", sub: "direct", type: "out", active: true });
    edges.push({ from: "q", to: "out" });
    return { nodes, edges, svgH: 148 };
  }

  /* ── SUPER MODE ── */
  const b1 = flow.bot1Enabled;
  const b2 = flow.bot2Enabled;
  const b3 = flow.bot3Enabled;
  const m12 = flow.merge12Enabled && b1 && b2;
  const m123 = flow.merge123Enabled && b3;

  // Bot row
  nodes.push({ id: "bot1", cx: BX[0], cy: 26, label: modelLabel(models.bot1), sub: "mind 1", type: "bot", active: b1 });
  nodes.push({ id: "bot2", cx: BX[1], cy: 26, label: modelLabel(models.bot2), sub: "mind 2", type: "bot", active: b2 });
  nodes.push({ id: "bot3", cx: BX[2], cy: 26, label: modelLabel(models.bot3), sub: "mind 3", type: "bot", active: b3 });

  if (m12 && m123) {
    /* ─ full staged merge ─ */
    const mx12 = (BX[0] + BX[1]) / 2;
    nodes.push({ id: "m12", cx: mx12, cy: 106, label: "Merge 1+2", sub: "step a", type: "merge", active: true });
    nodes.push({ id: "m123", cx: W / 2, cy: 186, label: "Merge + Mind 3", sub: "step b", type: "merge", active: true });
    nodes.push({ id: "out", cx: W / 2, cy: 266, label: "Final Output", sub: "synthesized", type: "out", active: true });

    edges.push({ from: "bot1", to: "m12" });
    edges.push({ from: "bot2", to: "m12" });
    edges.push({ from: "m12", to: "m123" });
    edges.push({ from: "bot3", to: "m123" });
    edges.push({ from: "m123", to: "out" });
    return { nodes, edges, svgH: 302 };
  }

  if (m12 && !m123) {
    /* ─ merge bot1+bot2 only ─ */
    const mx12 = W / 2;
    nodes.push({ id: "m12", cx: mx12, cy: 106, label: "Merge 1+2", sub: "step a", type: "merge", active: true });
    nodes.push({ id: "out", cx: W / 2, cy: 186, label: "Final Output", sub: b3 ? "mind 3 bypassed" : "synthesized", type: "out", active: true });

    if (b1) edges.push({ from: "bot1", to: "m12" });
    if (b2) edges.push({ from: "bot2", to: "m12" });
    edges.push({ from: "m12", to: "out" });
    if (b3) edges.push({ from: "bot3", to: "out", dashed: true }); // bypassed
    return { nodes, edges, svgH: 224 };
  }

  if (!m12 && m123) {
    /* ─ no merge12, merge all into final ─ */
    nodes.push({ id: "m123", cx: W / 2, cy: 106, label: "Merge All", sub: "synthesis", type: "merge", active: true });
    nodes.push({ id: "out", cx: W / 2, cy: 186, label: "Final Output", sub: "synthesized", type: "out", active: true });

    if (b1) edges.push({ from: "bot1", to: "m123" });
    if (b2) edges.push({ from: "bot2", to: "m123" });
    if (b3) edges.push({ from: "bot3", to: "m123" });
    edges.push({ from: "m123", to: "out" });
    return { nodes, edges, svgH: 224 };
  }

  /* ─ no merges: enabled bots go directly to output ─ */
  const activeBots = [b1, b2, b3].filter(Boolean).length;
  nodes.push({
    id: "out",
    cx: W / 2,
    cy: 106,
    label: activeBots > 1 ? "Best Answer" : "Output",
    sub: activeBots > 1 ? "no merge" : "direct",
    type: "out",
    active: activeBots > 0,
  });

  if (b1) edges.push({ from: "bot1", to: "out" });
  if (b2) edges.push({ from: "bot2", to: "out" });
  if (b3) edges.push({ from: "bot3", to: "out" });
  return { nodes, edges, svgH: 144 };
}

function NodeRect({ n }: { n: N }) {
  const isOut = n.type === "out";
  const isMerge = n.type === "merge";

  const fill = n.active
    ? isOut ? "rgba(160,120,255,0.15)" : isMerge ? "rgba(160,120,255,0.08)" : "rgba(78,222,163,0.06)"
    : "#131b2e";

  const stroke = n.active
    ? isOut ? "#d0bcff" : isMerge ? "#a078ff" : "#4edea3"
    : "#2d3449";

  const labelColor = n.active
    ? isOut ? "#f0e8ff" : "#dae2fd"
    : "#494454";

  const subColor = n.active
    ? isOut ? "#c9aeff" : isMerge ? "#a078ff" : "#4edea3"
    : "#2d3449";

  const glowColor = isOut ? "#d0bcff" : isMerge ? "#a078ff" : "#4edea3";

  return (
    <g opacity={n.active ? 1 : 0.35}>
      {/* Ambient glow behind active nodes */}
      {n.active && (
        <ellipse
          cx={n.cx}
          cy={n.cy}
          rx={NW / 2 + 6}
          ry={NH / 2 + 4}
          fill={glowColor}
          opacity={0.08}
          style={{ filter: "blur(8px)" }}
        >
          <animate
            attributeName="opacity"
            values="0.06;0.14;0.06"
            dur="3s"
            repeatCount="indefinite"
          />
        </ellipse>
      )}
      <rect
        x={n.cx - NW / 2}
        y={n.cy - NH / 2}
        width={NW}
        height={NH}
        rx={NR}
        fill={fill}
        stroke={stroke}
        strokeWidth={n.active ? 1.5 : 1}
      />
      {/* Glow ring for output */}
      {isOut && n.active && (
        <rect
          x={n.cx - NW / 2}
          y={n.cy - NH / 2}
          width={NW}
          height={NH}
          rx={NR}
          fill="none"
          stroke="#d0bcff"
          strokeWidth={3}
          opacity={0.15}
        >
          <animate
            attributeName="opacity"
            values="0.1;0.3;0.1"
            dur="2.5s"
            repeatCount="indefinite"
          />
        </rect>
      )}
      <text
        x={n.cx}
        y={n.cy - (4)}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={labelColor}
        fontSize={9}
        fontWeight={600}
        fontFamily="Inter, sans-serif"
      >
        {n.label.length > 11 ? n.label.slice(0, 11) + "…" : n.label}
      </text>
      <text
        x={n.cx}
        y={n.cy + 8}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={subColor}
        fontSize={7}
        fontWeight={500}
        fontFamily="JetBrains Mono, monospace"
        letterSpacing={0.5}
        style={{ textTransform: "uppercase" }}
      >
        {n.sub}
      </text>
    </g>
  );
}

export function FlowDiagram({ flow, models }: { flow: FlowConfig; models: ModelConfig }) {
  const { nodes, edges, svgH } = buildLayout(flow, models);
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <svg
      width={W}
      height={svgH}
      viewBox={`0 0 ${W} ${svgH}`}
      className="w-full"
      style={{ overflow: "visible" }}
    >
      <defs>
        <marker id="ah-active" markerWidth={7} markerHeight={5} refX={6} refY={2.5} orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill="#a078ff" />
        </marker>
        <marker id="ah-dim" markerWidth={7} markerHeight={5} refX={6} refY={2.5} orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill="#2d3449" />
        </marker>
        <marker id="ah-bypass" markerWidth={7} markerHeight={5} refX={6} refY={2.5} orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill="#494454" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((e, i) => {
        const src = nodeMap[e.from];
        const dst = nodeMap[e.to];
        if (!src || !dst) return null;
        const active = src.active && dst.active && !e.dashed;
        const d = cubicPath(src.cx, src.cy, dst.cx, dst.cy);
        return (
          <g key={i}>
            {/* Glow trail for active edges */}
            {active && (
              <path
                d={d}
                fill="none"
                stroke="#a078ff"
                strokeWidth={4}
                opacity={0.1}
                style={{ filter: "blur(3px)" }}
              />
            )}
            <path
              d={d}
              fill="none"
              stroke={active ? "#a078ff" : e.dashed ? "#494454" : "#2d3449"}
              strokeWidth={active ? 1.5 : 1}
              strokeDasharray={e.dashed ? "5 3" : active ? "8 4" : undefined}
              markerEnd={`url(#${active ? "ah-active" : e.dashed ? "ah-bypass" : "ah-dim"})`}
              opacity={active ? 0.8 : 0.3}
              className={active ? "flow-edge-active" : undefined}
            />
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map((n) => (
        <NodeRect key={n.id} n={n} />
      ))}
    </svg>
  );
}
