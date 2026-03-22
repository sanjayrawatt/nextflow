"use client";

import { memo } from "react";
import { NodeProps, useEdges } from "@xyflow/react";
import { Crop } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NodeWrapper } from "./node-wrapper";
import { useWorkflowStore } from "@/store/workflow-store";
import { CropImageNodeData } from "@/types/workflow";

export const CropImageNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as unknown as CropImageNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const edges = useEdges();

  // Detect which input handles are connected
  const connectedHandles = new Set(
    edges
      .filter((e) => e.target === id)
      .map((e) => e.targetHandle)
      .filter(Boolean) as string[],
  );
  const xConnected = connectedHandles.has("x_percent");
  const yConnected = connectedHandles.has("y_percent");
  const wConnected = connectedHandles.has("width_percent");
  const hConnected = connectedHandles.has("height_percent");

  const inputClass = (connected: boolean) =>
    `h-7 text-xs transition-opacity ${connected ? "opacity-40 bg-gray-50" : ""}`;

  return (
    <NodeWrapper
      title="Crop Image"
      icon={<Crop className="w-4 h-4 text-pink-600" />}
      color="border-pink-500"
      isRunning={nodeData.isRunning}
      inputHandles={[
        { id: "image_url", label: "Image URL", required: true },
        { id: "x_percent", label: "X %" },
        { id: "y_percent", label: "Y %" },
        { id: "width_percent", label: "Width %" },
        { id: "height_percent", label: "Height %" },
      ]}
      outputHandles={[{ id: "output", label: "Cropped Image" }]}
    >
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">
              X %{" "}
              {xConnected && <span className="text-violet-500">(wired)</span>}
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={nodeData.xPercent}
              onChange={(e) =>
                updateNodeData(id, { xPercent: Number(e.target.value) })
              }
              className={inputClass(xConnected)}
              disabled={xConnected}
            />
          </div>
          <div>
            <Label className="text-[10px]">
              Y %{" "}
              {yConnected && <span className="text-violet-500">(wired)</span>}
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={nodeData.yPercent}
              onChange={(e) =>
                updateNodeData(id, { yPercent: Number(e.target.value) })
              }
              className={inputClass(yConnected)}
              disabled={yConnected}
            />
          </div>
          <div>
            <Label className="text-[10px]">
              Width %{" "}
              {wConnected && <span className="text-violet-500">(wired)</span>}
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={nodeData.widthPercent}
              onChange={(e) =>
                updateNodeData(id, { widthPercent: Number(e.target.value) })
              }
              className={inputClass(wConnected)}
              disabled={wConnected}
            />
          </div>
          <div>
            <Label className="text-[10px]">
              Height %{" "}
              {hConnected && <span className="text-violet-500">(wired)</span>}
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={nodeData.heightPercent}
              onChange={(e) =>
                updateNodeData(id, { heightPercent: Number(e.target.value) })
              }
              className={inputClass(hConnected)}
              disabled={hConnected}
            />
          </div>
        </div>

        {nodeData.outputUrl && (
          <div className="mt-2">
            <img
              src={nodeData.outputUrl}
              alt="Cropped"
              className="w-full h-24 object-cover rounded-md"
            />
          </div>
        )}
      </div>
    </NodeWrapper>
  );
});

CropImageNode.displayName = "CropImageNode";
