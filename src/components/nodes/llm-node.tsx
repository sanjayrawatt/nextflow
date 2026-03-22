"use client";

import { memo } from "react";
import { NodeProps, useEdges } from "@xyflow/react";
import { Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NodeWrapper } from "./node-wrapper";
import { useWorkflowStore } from "@/store/workflow-store";
import { LLMNodeData } from "@/types/workflow";

const GEMINI_MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
];

export const LLMNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as unknown as LLMNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const edges = useEdges();

  // Detect which input handles are currently connected
  const connectedHandles = new Set(
    edges
      .filter((e) => e.target === id)
      .map((e) => e.targetHandle)
      .filter(Boolean) as string[],
  );
  const systemConnected = connectedHandles.has("system_prompt");
  const messageConnected = connectedHandles.has("user_message");

  return (
    <NodeWrapper
      title="Run Any LLM"
      icon={<Sparkles className="w-4 h-4 text-amber-600" />}
      color="border-amber-500"
      isRunning={nodeData.isRunning}
      inputHandles={[
        { id: "system_prompt", label: "System Prompt" },
        { id: "user_message", label: "User Message", required: true },
        { id: "images", label: "Images" },
      ]}
      outputHandles={[{ id: "output", label: "Output" }]}
    >
      <div className="space-y-2">
        <Select
          value={nodeData.model}
          onValueChange={(value) => updateNodeData(id, { model: value })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {GEMINI_MODELS.map((model) => (
              <SelectItem
                key={model.value}
                value={model.value}
                className="text-xs"
              >
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Textarea
            value={nodeData.systemPrompt}
            onChange={(e) =>
              updateNodeData(id, { systemPrompt: e.target.value })
            }
            placeholder="System prompt (optional)..."
            className={`min-h-[50px] text-xs resize-none transition-opacity ${systemConnected ? "opacity-40 pointer-events-none bg-gray-50" : ""}`}
            disabled={systemConnected}
          />
          {systemConnected && (
            <span className="absolute top-1 right-2 text-[9px] text-violet-500 font-medium">
              via wire
            </span>
          )}
        </div>

        <div className="relative">
          <Textarea
            value={nodeData.userMessage}
            onChange={(e) =>
              updateNodeData(id, { userMessage: e.target.value })
            }
            placeholder="User message..."
            className={`min-h-[50px] text-xs resize-none transition-opacity ${messageConnected ? "opacity-40 pointer-events-none bg-gray-50" : ""}`}
            disabled={messageConnected}
          />
          {messageConnected && (
            <span className="absolute top-1 right-2 text-[9px] text-violet-500 font-medium">
              via wire
            </span>
          )}
        </div>

        {nodeData.output && (
          <div className="p-2 bg-gray-50 rounded-md text-xs text-gray-700 max-h-24 overflow-y-auto">
            {nodeData.output}
          </div>
        )}
      </div>
    </NodeWrapper>
  );
});

LLMNode.displayName = "LLMNode";
