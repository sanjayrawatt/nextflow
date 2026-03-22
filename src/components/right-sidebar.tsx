"use client";

import { useState, useEffect } from "react";
import {
  History,
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useWorkflowStore } from "@/store/workflow-store";
import { WorkflowRun, NodeExecutionResult } from "@/types/workflow";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(date: Date): string {
  // Use a consistent format that doesn't depend on locale
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getStatusIcon(status: WorkflowRun["status"]) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "partial":
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    case "running":
      return <Play className="w-4 h-4 text-blue-500 animate-pulse" />;
    default:
      return null;
  }
}

function getStatusBadge(status: WorkflowRun["status"]) {
  switch (status) {
    case "success":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          Success
        </Badge>
      );
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "partial":
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
          Partial
        </Badge>
      );
    case "running":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-600">
          Running
        </Badge>
      );
    default:
      return null;
  }
}

function getRunTypeLabel(type: WorkflowRun["runType"]) {
  switch (type) {
    case "full":
      return "Full Workflow";
    case "partial":
      return "Selected Nodes";
    case "single":
      return "Single Node";
    default:
      return type;
  }
}

export function RightSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [dbHistory, setDbHistory] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const runHistory = useWorkflowStore((state) => state.runHistory);
  const workflowId = useWorkflowStore((state) => state.workflowId);

  // Fetch history from database
  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const url = workflowId
        ? `/api/history?workflowId=${workflowId}`
        : "/api/history";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDbHistory(
          data.histories?.map((h: Record<string, unknown>) => ({
            id: h.id,
            workflowId: h.workflowId,
            runType: h.runType as WorkflowRun["runType"],
            status: h.status as WorkflowRun["status"],
            duration: h.duration || 0,
            nodeResults: (h.nodeResults as NodeExecutionResult[]) || [],
            startedAt: new Date(h.startedAt as string),
            completedAt: h.completedAt
              ? new Date(h.completedAt as string)
              : undefined,
          })) || [],
        );
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [workflowId]);

  // Combine local and DB history, preferring local for recent runs
  const displayHistory = runHistory.length > 0 ? runHistory : dbHistory;

  return (
    <div
      className={`flex flex-col border-l bg-white transition-all duration-300 ${
        isCollapsed ? "w-12" : "w-72"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <span className="font-semibold text-sm">History</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={fetchHistory}
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
      </div>

      {!isCollapsed && (
        <>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {displayHistory.map((run) => (
                <div
                  key={run.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRun === run.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() =>
                    setSelectedRun(selectedRun === run.id ? null : run.id)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(run.status)}
                      <span className="text-xs font-medium">
                        Run #{run.id.slice(-3)}
                      </span>
                    </div>
                    {getStatusBadge(run.status)}
                  </div>

                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(run.startedAt)}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-500">
                        {getRunTypeLabel(run.runType)}
                      </span>
                      <span className="text-gray-600">
                        {formatDuration(run.duration)}
                      </span>
                    </div>
                  </div>

                  {selectedRun === run.id &&
                    run.nodeResults &&
                    run.nodeResults.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-[10px] text-gray-500 mb-2">
                          Node Execution Details
                        </p>
                        <div className="space-y-1">
                          {run.nodeResults.map((result) => (
                            <div
                              key={result.nodeId}
                              className="flex items-center gap-2 text-[10px]"
                            >
                              {result.status === "success" ? (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                              ) : result.status === "failed" ? (
                                <XCircle className="w-3 h-3 text-red-500" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-yellow-500" />
                              )}
                              <span className="truncate flex-1">
                                {result.nodeId.split("-")[0]}
                              </span>
                              <span className="text-gray-400">
                                {formatDuration(result.executionTime)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {run.nodeResults.some((r) => r.error) && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-[10px] text-red-600">
                            {run.nodeResults.find((r) => r.error)?.error}
                          </div>
                        )}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
