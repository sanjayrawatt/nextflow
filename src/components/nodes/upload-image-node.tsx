"use client";

import { memo, useCallback, useState } from "react";
import { NodeProps } from "@xyflow/react";
import { ImageIcon, Upload, X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NodeWrapper } from "./node-wrapper";
import { useWorkflowStore } from "@/store/workflow-store";
import { UploadImageNodeData } from "@/types/workflow";

export const UploadImageNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as unknown as UploadImageNodeData;
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
          body: JSON.stringify({ fileType: "image" }),
        });

        if (!sigRes.ok) throw new Error("Failed to get upload signature");
        const { params, signature } = await sigRes.json();

        // Upload to Transloadit
        const formData = new FormData();
        formData.append("params", params);
        formData.append("signature", signature);
        formData.append("file", file);

        setUploadProgress(30);

        const uploadRes = await fetch(
          "https://api2.transloadit.com/assemblies",
          {
            method: "POST",
            body: formData,
          },
        );

        if (!uploadRes.ok) throw new Error("Upload failed");

        setUploadProgress(70);

        const assembly = await uploadRes.json();

        // Poll for completion
        let result = assembly;
        while (
          result.ok === "ASSEMBLY_EXECUTING" ||
          result.ok === "ASSEMBLY_UPLOADING"
        ) {
          await new Promise((r) => setTimeout(r, 1000));
          const pollRes = await fetch(
            `https://api2.transloadit.com/assemblies/${assembly.assembly_id}`,
          );
          result = await pollRes.json();
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }

        setUploadProgress(100);

        // Get the uploaded file URL
        let imageUrl = "";
        let imageBase64 = "";

        if (result.results?.compress?.[0]?.url) {
          imageUrl = result.results.compress[0].url;
        } else if (result.uploads?.[0]?.url) {
          imageUrl = result.uploads[0].url;
        }

        // Also keep local preview via base64 for LLM vision
        const reader = new FileReader();
        reader.onloadend = () => {
          imageBase64 = reader.result as string;
          updateNodeData(id, {
            imageUrl: imageUrl || URL.createObjectURL(file),
            fileName: file.name,
            imageData: imageBase64.split(",")[1], // base64 without prefix
            mimeType: file.type,
            transloaditUrl: imageUrl,
          });
        };
        reader.readAsDataURL(file);

        if (!imageUrl) {
          // Fallback to local blob URL
          updateNodeData(id, {
            imageUrl: URL.createObjectURL(file),
            fileName: file.name,
          });
        }
      } catch (error) {
        console.error("Upload error:", error);
        // Fallback to local upload
        const url = URL.createObjectURL(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          updateNodeData(id, {
            imageUrl: url,
            fileName: file.name,
            imageData: base64.split(",")[1],
            mimeType: file.type,
          });
        };
        reader.readAsDataURL(file);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [id, updateNodeData],
  );

  const handleClear = useCallback(() => {
    updateNodeData(id, { imageUrl: null, fileName: null, imageData: null });
  }, [id, updateNodeData]);

  return (
    <NodeWrapper
      title="Upload Image"
      icon={<ImageIcon className="w-4 h-4 text-green-600" />}
      color="border-green-500"
      outputHandles={[{ id: "output", label: "Image URL" }]}
    >
      {nodeData.imageUrl ? (
        <div className="space-y-2">
          <div className="relative">
            <img
              src={nodeData.imageUrl}
              alt="Uploaded"
              className="w-full h-32 object-cover rounded-md"
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
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
              <p className="text-xs text-gray-500">
                Uploading... {uploadProgress}%
              </p>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div
                  className="bg-green-500 h-1 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">Click to upload image</p>
              <p className="text-[10px] text-gray-400">JPG, PNG, WebP, GIF</p>
            </div>
          )}
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </label>
      )}
    </NodeWrapper>
  );
});

UploadImageNode.displayName = "UploadImageNode";
