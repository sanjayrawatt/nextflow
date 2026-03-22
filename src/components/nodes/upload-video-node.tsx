"use client";

import { memo, useCallback, useState } from "react";
import { NodeProps } from "@xyflow/react";
import { Video, Upload, X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NodeWrapper } from "./node-wrapper";
import { useWorkflowStore } from "@/store/workflow-store";
import { UploadVideoNodeData } from "@/types/workflow";

export const UploadVideoNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as unknown as UploadVideoNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setUploadProgress(0);

      try {
        // Get signed params from our API
        const sigRes = await fetch("/api/transloadit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileType: "video" }),
        });

        if (!sigRes.ok) throw new Error("Failed to get upload signature");
        const { params, signature } = await sigRes.json();

        // Upload to Transloadit
        const formData = new FormData();
        formData.append("params", params);
        formData.append("signature", signature);
        formData.append("file", file);

        setUploadProgress(20);

        const uploadRes = await fetch(
          "https://api2.transloadit.com/assemblies",
          {
            method: "POST",
            body: formData,
          },
        );

        if (!uploadRes.ok) throw new Error("Upload failed");
        setUploadProgress(50);

        const assembly = await uploadRes.json();

        // Poll for completion
        let result = assembly;
        let attempts = 0;
        while (
          (result.ok === "ASSEMBLY_EXECUTING" ||
            result.ok === "ASSEMBLY_UPLOADING") &&
          attempts < 30
        ) {
          await new Promise((r) => setTimeout(r, 1500));
          const pollRes = await fetch(
            `https://api2.transloadit.com/assemblies/${assembly.assembly_id}`,
          );
          result = await pollRes.json();
          attempts++;
          setUploadProgress((prev) => Math.min(prev + 5, 90));
        }

        setUploadProgress(100);

        // Get the uploaded file URL
        let videoUrl = "";
        if (result.uploads?.[0]?.url) {
          videoUrl = result.uploads[0].url;
        } else if (result.results?.store?.[0]?.url) {
          videoUrl = result.results.store[0].url;
        }

        updateNodeData(id, {
          videoUrl: videoUrl || URL.createObjectURL(file),
          fileName: file.name,
          transloaditUrl: videoUrl || null,
        });
      } catch (error) {
        console.error("Video upload error:", error);
        // Fallback to local blob URL
        const url = URL.createObjectURL(file);
        updateNodeData(id, { videoUrl: url, fileName: file.name });
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [id, updateNodeData],
  );

  const handleClear = useCallback(() => {
    updateNodeData(id, {
      videoUrl: null,
      fileName: null,
      transloaditUrl: null,
    });
  }, [id, updateNodeData]);

  return (
    <NodeWrapper
      title="Upload Video"
      icon={<Video className="w-4 h-4 text-purple-600" />}
      color="border-purple-500"
      outputHandles={[{ id: "output", label: "Video URL" }]}
    >
      {nodeData.videoUrl ? (
        <div className="space-y-2">
          <div className="relative">
            <video
              src={nodeData.videoUrl}
              controls
              className="w-full h-32 rounded-md"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 w-6 h-6"
              onClick={handleClear}
            >
              <X className="w-3 h-3" />
            </Button>
            {nodeData.transloaditUrl && (
              <div className="absolute bottom-1 left-1">
                <CheckCircle2 className="w-4 h-4 text-green-500 bg-white rounded-full" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {nodeData.fileName}
          </p>
          {nodeData.transloaditUrl && (
            <p className="text-[10px] text-green-600">
              Uploaded via Transloadit
            </p>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-gray-400 transition-colors">
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 px-4">
              <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
              <p className="text-xs text-gray-500">
                Uploading... {uploadProgress}%
              </p>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div
                  className="bg-purple-500 h-1 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">Click to upload video</p>
              <p className="text-[10px] text-gray-400">MP4, MOV, WebM, M4V</p>
            </div>
          )}
          <input
            type="file"
            className="hidden"
            accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </label>
      )}
    </NodeWrapper>
  );
});

UploadVideoNode.displayName = "UploadVideoNode";
