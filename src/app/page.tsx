"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { Header } from "@/components/header";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";
import { WorkflowCanvas } from "@/components/workflow-canvas";

export default function Home() {
  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-gray-50">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <LeftSidebar />
          <main className="flex-1 relative h-full">
            <WorkflowCanvas />
          </main>
          <RightSidebar />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
