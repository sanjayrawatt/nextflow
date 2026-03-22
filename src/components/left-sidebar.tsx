"use client";

import { useState } from "react";
import {
  FileText,
  ImageIcon,
  Video,
  Sparkles,
  Crop,
  Film,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useWorkflowStore } from "@/store/workflow-store";
import { NodeType } from "@/types/workflow";

interface NodeButton {
  type: NodeType;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const nodeButtons: NodeButton[] = [
  {
    type: "text",
    label: "Text",
    icon: <FileText className="w-5 h-5" />,
    color: "text-blue-600 bg-blue-50 hover:bg-blue-100",
    description: "Simple text input with textarea",
  },
  {
    type: "upload-image",
    label: "Upload Image",
    icon: <ImageIcon className="w-5 h-5" />,
    color: "text-green-600 bg-green-50 hover:bg-green-100",
    description: "Upload and preview images",
  },
  {
    type: "upload-video",
    label: "Upload Video",
    icon: <Video className="w-5 h-5" />,
    color: "text-purple-600 bg-purple-50 hover:bg-purple-100",
    description: "Upload and preview videos",
  },
  {
    type: "llm",
    label: "Run Any LLM",
    icon: <Sparkles className="w-5 h-5" />,
    color: "text-amber-600 bg-amber-50 hover:bg-amber-100",
    description: "Execute LLM with Gemini API",
  },
  {
    type: "crop-image",
    label: "Crop Image",
    icon: <Crop className="w-5 h-5" />,
    color: "text-pink-600 bg-pink-50 hover:bg-pink-100",
    description: "Crop images with FFmpeg",
  },
  {
    type: "extract-frame",
    label: "Extract Frame",
    icon: <Film className="w-5 h-5" />,
    color: "text-cyan-600 bg-cyan-50 hover:bg-cyan-100",
    description: "Extract frames from videos",
  },
];

export function LeftSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const addNode = useWorkflowStore((state) => state.addNode);

  const filteredNodes = nodeButtons.filter((node) =>
    node.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAddNode = (type: NodeType) => {
    // Add node at a default position in the center of the canvas
    addNode(type, { x: 250, y: 200 });
  };

  return (
    <div
      className={`flex flex-col border-r bg-white transition-all duration-300 ${
        isCollapsed ? "w-12" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        {!isCollapsed && <span className="font-semibold text-sm">Nodes</span>}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {!isCollapsed && (
        <>
          {/* Search */}
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          <Separator />

          {/* Quick Access */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quick Access
              </span>
              <div className="space-y-1">
                {filteredNodes.map((node) => (
                  <Button
                    key={node.type}
                    variant="ghost"
                    className={`w-full justify-start gap-3 h-auto py-3 px-3 ${node.color}`}
                    onClick={() => handleAddNode(node.type)}
                  >
                    {node.icon}
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">{node.label}</span>
                      <span className="text-[10px] text-gray-500 line-clamp-1">
                        {node.description}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
