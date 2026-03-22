"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Play,
  Save,
  Download,
  Upload,
  MoreHorizontal,
  FolderOpen,
  Trash2,
  Plus,
  Undo2,
  Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useWorkflowStore } from "@/store/workflow-store";
import { runWorkflow } from "@/lib/workflow-runner";
import { UserButton } from "@clerk/nextjs";

interface SavedWorkflow {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export function Header() {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>([]);
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName);
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const setWorkflowId = useWorkflowStore((state) => state.setWorkflowId);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const setIsRunning = useWorkflowStore((state) => state.setIsRunning);
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const selectedNodes = useWorkflowStore((state) => state.selectedNodes);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const addRunToHistory = useWorkflowStore((state) => state.addRunToHistory);
  const setNodes = useWorkflowStore((state) => state.setNodes);
  const setEdges = useWorkflowStore((state) => state.setEdges);
  const clearWorkflow = useWorkflowStore((state) => state.clearWorkflow);
  const loadSampleWorkflow = useWorkflowStore(
    (state) => state.loadSampleWorkflow,
  );
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const historyIndex = useWorkflowStore((state) => state.historyIndex);
  const historyLength = useWorkflowStore((state) => state.history.length);

  // Computed values for button states
  const canUndoNow = historyIndex >= 0;
  const canRedoNow = historyIndex < historyLength - 1;

  // Fetch saved workflows
  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await fetch("/api/workflows");
      if (res.ok) {
        const data = await res.json();
        setSavedWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error("Failed to fetch workflows:", error);
    }
  };

  // Keyboard shortcuts for undo/redo
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    },
    [undo, redo],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleRunWorkflow = async () => {
    if (isRunning || nodes.length === 0) return;

    setIsRunning(true);
    try {
      const result = await runWorkflow({
        nodes,
        edges,
        updateNodeData,
        addRunToHistory,
      });

      if (result.success) {
        console.log("Workflow completed successfully!", result);
      } else {
        console.error("Workflow had some failures:", result);
      }
    } catch (error) {
      console.error("Workflow execution error:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunSelected = async () => {
    if (isRunning || selectedNodes.length === 0) return;

    setIsRunning(true);
    try {
      const selectedNodeObjects = nodes.filter((n) =>
        selectedNodes.includes(n.id),
      );
      const relevantEdges = edges.filter(
        (e) =>
          selectedNodes.includes(e.source) && selectedNodes.includes(e.target),
      );

      const result = await runWorkflow({
        nodes: selectedNodeObjects,
        edges: relevantEdges,
        updateNodeData,
        addRunToHistory,
      });

      console.log("Selected nodes execution result:", result);
    } catch (error) {
      console.error("Selected nodes execution error:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      if (workflowId) {
        // Update existing workflow
        const res = await fetch(`/api/workflows/${workflowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: workflowName, nodes, edges }),
        });
        if (res.ok) {
          console.log("Workflow updated!");
          fetchWorkflows();
        }
      } else {
        // Create new workflow
        const res = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: workflowName, nodes, edges }),
        });
        if (res.ok) {
          const data = await res.json();
          setWorkflowId(data.workflow.id);
          console.log("Workflow saved!");
          fetchWorkflows();
        }
      }
    } catch (error) {
      console.error("Failed to save workflow:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadWorkflow = async (id: string) => {
    try {
      const res = await fetch(`/api/workflows/${id}`);
      if (res.ok) {
        const data = await res.json();
        const workflow = data.workflow;
        setWorkflowId(workflow.id);
        setWorkflowName(workflow.name);
        setNodes(workflow.nodes || []);
        setEdges(workflow.edges || []);
        console.log("Workflow loaded!");
      }
    } catch (error) {
      console.error("Failed to load workflow:", error);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (workflowId === id) {
          clearWorkflow();
        }
        fetchWorkflows();
        console.log("Workflow deleted!");
      }
    } catch (error) {
      console.error("Failed to delete workflow:", error);
    }
  };

  const handleNewWorkflow = () => {
    clearWorkflow();
  };

  const handleExport = () => {
    const workflow = {
      name: workflowName,
      nodes,
      edges,
    };
    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.nodes) {
          setNodes(data.nodes || []);
          setEdges(data.edges || []);
          if (data.name) setWorkflowName(data.name);
        }
      } catch {
        console.error("Invalid workflow JSON file");
      }
    };
    input.click();
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b bg-white">
      {/* Left: Logo and Workflow Name */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="font-semibold text-lg">NextFlow</span>
        </div>

        <div className="h-6 w-px bg-gray-200" />

        {isEditingName ? (
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
            className="h-8 w-48 text-sm"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {workflowName}
          </button>
        )}
      </div>

      {/* Center: Undo/Redo and Run Buttons */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 mr-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={undo}
            disabled={!canUndoNow}
            title="Undo (Cmd+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={redo}
            disabled={!canRedoNow}
            title="Redo (Cmd+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-gray-200" />

        <Button
          variant="default"
          size="sm"
          className="gap-2 bg-green-600 hover:bg-green-700"
          onClick={handleRunWorkflow}
          disabled={isRunning || nodes.length === 0}
        >
          <Play className="w-4 h-4" />
          Run All
        </Button>

        {selectedNodes.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleRunSelected}
            disabled={isRunning}
          >
            <Play className="w-4 h-4" />
            Run Selected ({selectedNodes.length})
          </Button>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-gray-100 cursor-pointer">
            <MoreHorizontal className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleNewWorkflow} className="gap-2">
              <Plus className="w-4 h-4" />
              New Workflow
            </DropdownMenuItem>
            <DropdownMenuItem onClick={loadSampleWorkflow} className="gap-2">
              <Play className="w-4 h-4 text-violet-500" />
              Load Sample Workflow
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                <FolderOpen className="w-4 h-4" />
                Open Workflow
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {savedWorkflows.length === 0 ? (
                  <DropdownMenuItem disabled>
                    No saved workflows
                  </DropdownMenuItem>
                ) : (
                  savedWorkflows.map((wf) => (
                    <DropdownMenuItem
                      key={wf.id}
                      onClick={() => handleLoadWorkflow(wf.id)}
                      className="justify-between"
                    >
                      <span>{wf.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWorkflow(wf.id);
                        }}
                        className="ml-2 p-1 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleImport} className="gap-2">
              <Upload className="w-4 h-4" />
              Import Workflow
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-px bg-gray-200 mx-1" />

        <UserButton />
      </div>
    </header>
  );
}
