"use client";

import { memo, ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface NodeWrapperProps {
  title: string;
  icon: ReactNode;
  color: string;
  children: ReactNode;
  isRunning?: boolean;
  inputHandles?: { id: string; label?: string; required?: boolean }[];
  outputHandles?: { id: string; label?: string }[];
}

export const NodeWrapper = memo(
  ({
    title,
    icon,
    color,
    children,
    isRunning = false,
    inputHandles = [],
    outputHandles = [],
  }: NodeWrapperProps) => {
    return (
      <Card
        className={`w-64 border-2 ${color} relative transition-all duration-300 ${isRunning ? "node-running" : ""}`}
      >
        {/* Input Handles */}
        {inputHandles.map((handle, index) => (
          <Handle
            key={handle.id}
            type="target"
            position={Position.Left}
            id={handle.id}
            style={{
              top: `${((index + 1) / (inputHandles.length + 1)) * 100}%`,
              background: "#8b5cf6",
              width: 12,
              height: 12,
            }}
          />
        ))}

        <CardHeader className="p-3 pb-2 flex flex-row items-center gap-2">
          <div
            className={`p-1.5 rounded-md ${color.replace("border-", "bg-").replace("500", "100")}`}
          >
            {icon}
          </div>
          <span className="font-medium text-sm flex-1">{title}</span>
          {isRunning && (
            <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
          )}
        </CardHeader>

        <CardContent className="p-3 pt-0">{children}</CardContent>

        {/* Output Handles */}
        {outputHandles.map((handle, index) => (
          <Handle
            key={handle.id}
            type="source"
            position={Position.Right}
            id={handle.id}
            style={{
              top: `${((index + 1) / (outputHandles.length + 1)) * 100}%`,
              background: "#8b5cf6",
              width: 12,
              height: 12,
            }}
          />
        ))}
      </Card>
    );
  },
);

NodeWrapper.displayName = "NodeWrapper";
