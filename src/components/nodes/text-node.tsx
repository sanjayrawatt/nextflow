"use client";

import { memo } from "react";
import { NodeProps } from "@xyflow/react";
import { FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { NodeWrapper } from "./node-wrapper";
import { useWorkflowStore } from "@/store/workflow-store";
import { TextNodeData } from "@/types/workflow";

export const TextNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as unknown as TextNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  return (
    <NodeWrapper
      title="Text"
      icon={<FileText className="w-4 h-4 text-blue-600" />}
      color="border-blue-500"
      outputHandles={[{ id: "output", label: "Text" }]}
    >
      <Textarea
        value={nodeData.text}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
        placeholder="Enter text..."
        className="min-h-[80px] text-xs resize-none"
      />
    </NodeWrapper>
  );
});

TextNode.displayName = "TextNode";
