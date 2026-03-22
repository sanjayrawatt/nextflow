import { Node, Edge } from '@xyflow/react'

// Handle data types for type-safe connections
export type HandleDataType = 'text' | 'image' | 'video' | 'any'

// Connection type mapping for validation
export const HANDLE_TYPES: Record<string, Record<string, HandleDataType>> = {
  // Text node
  'text': {
    'output': 'text',
  },
  // Upload Image node
  'upload-image': {
    'output': 'image',
  },
  // Upload Video node
  'upload-video': {
    'output': 'video',
  },
  // LLM node
  'llm': {
    'system_prompt': 'text',
    'user_message': 'text',
    'images': 'image',
    'output': 'text',
  },
  // Crop Image node — 'image_url' is the main image input, x/y/w/h accept text
  'crop-image': {
    'image_url': 'image',
    'x_percent': 'text',
    'y_percent': 'text',
    'width_percent': 'text',
    'height_percent': 'text',
    'output': 'image',
  },
  // Extract Frame node — 'video_url' takes video, 'timestamp' takes text
  'extract-frame': {
    'video_url': 'video',
    'timestamp': 'text',
    'output': 'image',
  },
}

// Type compatibility matrix
export const TYPE_COMPATIBILITY: Record<HandleDataType, HandleDataType[]> = {
  'text': ['text', 'any'],
  'image': ['image', 'any'],
  'video': ['video', 'any'],
  'any': ['text', 'image', 'video', 'any'],
}

// Check if two handle types are compatible
export function areTypesCompatible(
  sourceType: HandleDataType,
  targetType: HandleDataType
): boolean {
  if (targetType === 'any') return true
  if (sourceType === 'any') return true
  return sourceType === targetType
}

// Get handle type for a node
export function getHandleType(
  nodeType: string,
  handleId: string,
  isSource: boolean
): HandleDataType {
  const nodeHandles = HANDLE_TYPES[nodeType]
  if (!nodeHandles) return 'any'
  
  // If handleId is specified, use it; otherwise default to 'output' for source, 'input' for target
  const key = handleId || (isSource ? 'output' : 'input')
  return nodeHandles[key] || 'any'
}

export type NodeType = 
  | 'text'
  | 'upload-image'
  | 'upload-video'
  | 'llm'
  | 'crop-image'
  | 'extract-frame'

export interface TextNodeData {
  text: string
}

export interface UploadImageNodeData {
  imageUrl: string | null
  fileName: string | null
  imageData?: string | null  // base64 data for LLM vision
  mimeType?: string | null
  transloaditUrl?: string | null  // CDN URL from Transloadit
}

export interface UploadVideoNodeData {
  videoUrl: string | null
  fileName: string | null
  transloaditUrl?: string | null  // CDN URL from Transloadit
}

export interface LLMNodeData {
  model: string
  systemPrompt: string
  userMessage: string
  output: string | null
  isRunning: boolean
}

export interface CropImageNodeData {
  xPercent: number
  yPercent: number
  widthPercent: number
  heightPercent: number
  outputUrl: string | null
  isRunning: boolean
}

export interface ExtractFrameNodeData {
  timestamp: string
  outputUrl: string | null
  isRunning: boolean
}

export type NodeData = 
  | TextNodeData 
  | UploadImageNodeData 
  | UploadVideoNodeData 
  | LLMNodeData 
  | CropImageNodeData 
  | ExtractFrameNodeData

export type WorkflowNode = Node

export type WorkflowEdge = Edge

export interface NodeExecutionResult {
  nodeId: string
  status: 'success' | 'failed' | 'running'
  output: unknown
  error?: string
  executionTime: number
}

export interface WorkflowRun {
  id: string
  workflowId: string
  runType: 'full' | 'partial' | 'single'
  status: 'success' | 'failed' | 'partial' | 'running'
  duration: number
  nodeResults: NodeExecutionResult[]
  startedAt: Date
  completedAt?: Date
}
