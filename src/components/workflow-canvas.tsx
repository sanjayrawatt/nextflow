"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
  SelectionMode,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { useWorkflowStore } from "@/store/workflow-store";
import { getHandleType, areTypesCompatible } from "@/types/workflow";

export function WorkflowCanvas() {
  const storeNodes = useWorkflowStore((state) => state.nodes);
  const storeEdges = useWorkflowStore((state) => state.edges);
  const setStoreNodes = useWorkflowStore((state) => state.setNodes);
  const setStoreEdges = useWorkflowStore((state) => state.setEdges);
  const setSelectedNodes = useWorkflowStore((state) => state.setSelectedNodes);

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);

  // Sync store nodes to React Flow when store changes (e.g., when adding nodes from sidebar)
  useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  // Sync store edges to React Flow when store changes
  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  const handleNodesChange = useCallback(
    (changes: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onNodesChange(changes as any);
    },
    [onNodesChange],
  );

  // Sync React Flow nodes back to store when dragging/selecting
  useEffect(() => {
    setStoreNodes(nodes);
  }, [nodes, setStoreNodes]);

  const handleEdgesChange = useCallback(
    (changes: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onEdgesChange(changes as any);
    },
    [onEdgesChange],
  );

  // Sync React Flow edges back to store
  useEffect(() => {
    setStoreEdges(edges);
  }, [edges, setStoreEdges]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `e-${Date.now()}`,
        animated: true,
        style: { stroke: "#8b5cf6", strokeWidth: 2 },
      };
      setEdges((eds) => [...eds, newEdge]);
    },
    [setEdges],
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      setSelectedNodes(selectedNodes.map((n) => n.id));
    },
    [setSelectedNodes],
  );

  // DAG cycle detection: returns true if adding source→target would create a cycle
  const wouldCreateCycle = useCallback(
    (source: string, target: string): boolean => {
      // BFS/DFS from target — if we can reach source, adding this edge creates a cycle
      const visited = new Set<string>();
      const queue = [target];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current === source) return true;
        if (visited.has(current)) continue;
        visited.add(current);
        edges.forEach((e) => {
          if (e.source === current) queue.push(e.target);
        });
      }
      return false;
    },
    [edges],
  );

  // Type-safe connection validation + DAG validation
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      const { source, target, sourceHandle, targetHandle } = connection;

      if (!source || !target) return false;

      // Prevent self-connections
      if (source === target) return false;

      // Prevent cycles (DAG validation)
      if (wouldCreateCycle(source, target)) return false;

      // Find the source and target nodes
      const sourceNode = nodes.find((n) => n.id === source);
      const targetNode = nodes.find((n) => n.id === target);

      if (!sourceNode || !targetNode) return false;

      // Get handle types
      const sourceType = getHandleType(
        sourceNode.type || "",
        sourceHandle || "",
        true,
      );
      const targetType = getHandleType(
        targetNode.type || "",
        targetHandle || "",
        false,
      );

      // Check type compatibility
      return areTypesCompatible(sourceType, targetType);
    },
    [nodes, wouldCreateCycle],
  );

  // Edge styling based on connection validity
  const edgeStyle = useMemo(
    () => ({
      stroke: "#8b5cf6",
      strokeWidth: 2,
    }),
    [],
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onSelectionChange={handleSelectionChange}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{ style: edgeStyle, animated: true }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag
        panOnDrag={[1, 2]}
        zoomOnDoubleClick={false}
        deleteKeyCode={["Backspace", "Delete"]}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#d4d4d8"
        />
        <Controls className="bg-white border shadow-sm" />
        <MiniMap
          className="bg-white border shadow-sm rounded-lg"
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}
