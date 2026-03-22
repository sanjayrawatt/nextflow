import { z } from 'zod'

// Gemini API validation
export const geminiRequestSchema = z.object({
  model: z.string().optional(),
  systemPrompt: z.string().optional().default(''),
  userMessage: z.string().optional().default(''),
  imageData: z.object({
    data: z.string(),
    mimeType: z.string().optional().default('image/jpeg'),
  }).optional().nullable(),
})

export type GeminiRequest = z.infer<typeof geminiRequestSchema>

// Crop Image API validation
export const cropImageRequestSchema = z.object({
  imageData: z.string().min(1, 'Image data is required'),
  xPercent: z.number().min(0).max(100).default(0),
  yPercent: z.number().min(0).max(100).default(0),
  widthPercent: z.number().min(1).max(100).default(100),
  heightPercent: z.number().min(1).max(100).default(100),
})

export type CropImageRequest = z.infer<typeof cropImageRequestSchema>

// Extract Frame API validation
export const extractFrameRequestSchema = z.object({
  videoData: z.string().min(1, 'Video data is required'),
  timestamp: z.union([z.string(), z.number()]).optional().default('0'),
})

export type ExtractFrameRequest = z.infer<typeof extractFrameRequestSchema>

// Workflow API validation
export const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional().nullable(),
  nodes: z.array(z.any()).default([]),
  edges: z.array(z.any()).default([]),
})

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
})

export type CreateWorkflowRequest = z.infer<typeof createWorkflowSchema>
export type UpdateWorkflowRequest = z.infer<typeof updateWorkflowSchema>

// History API validation
export const createHistorySchema = z.object({
  workflowId: z.string().min(1),
  runType: z.enum(['full', 'partial', 'single']),
  status: z.enum(['success', 'failed', 'partial', 'running']),
  duration: z.number().optional().nullable(),
  nodeResults: z.array(z.object({
    nodeId: z.string(),
    status: z.enum(['success', 'failed', 'skipped']),
    output: z.any().optional().nullable(),
    error: z.string().optional().nullable(),
    executionTime: z.number(),
  })),
})

export type CreateHistoryRequest = z.infer<typeof createHistorySchema>

// Helper function to validate request body
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)
    
    if (!result.success) {
      const errors = result.error.issues.map(issue => issue.message).join(', ')
      return { success: false, error: errors }
    }
    
    return { success: true, data: result.data }
  } catch {
    return { success: false, error: 'Invalid JSON body' }
  }
}
