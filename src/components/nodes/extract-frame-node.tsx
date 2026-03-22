"use client";

import { memo } from "react";
import { NodeProps, useEdges } from "@xyflow/react";
import { Film } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NodeWrapper } from "./node-wrapper";
import { useWorkflowStore } from "@/store/workflow-store";
import { ExtractFrameNodeData } from "@/types/workflow";

export const ExtractFrameNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as unknown as ExtractFrameNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const edges = useEdges();

  // Detect which input handles are connected
  const connectedHandles = new Set(
    edges
      .filter((e) => e.target === id)
      .map((e) => e.targetHandle)
      .filter(Boolean) as string[],
  );
  const timestampConnected = connectedHandles.has("timestamp");

  return (
    <NodeWrapper
      title="Extract Frame"
      icon={<Film className="w-4 h-4 text-cyan-600" />}
      color="border-cyan-500"
      isRunning={nodeData.isRunning}
      inputHandles={[
        { id: "video_url", label: "Video URL", required: true },
        { id: "timestamp", label: "Timestamp" },
      ]}
      outputHandles={[{ id: "output", label: "Frame Image" }]}
    >
      <div className="space-y-2">
        <div>
          <Label className="text-[10px]">
            Timestamp (sec or %){" "}
            {timestampConnected && (
              <span className="text-violet-500">(wired)</span>
            )}
          </Label>
          <Input
            value={nodeData.timestamp}
            onChange={(e) => updateNodeData(id, { timestamp: e.target.value })}
            placeholder="e.g., 5 or 50%"
            className={`h-8 text-xs transition-opacity ${timestampConnected ? "opacity-40 bg-gray-50" : ""}`}
            disabled={timestampConnected}
          />
        </div>

        {nodeData.outputUrl && (
          <div className="mt-2">
            <img
              src={nodeData.outputUrl}
              alt="Extracted Frame"
              className="w-full h-24 object-cover rounded-md"
            />
          </div>
        )}
      </div>
    </NodeWrapper>
  );
});

ExtractFrameNode.displayName = "ExtractFrameNode";
