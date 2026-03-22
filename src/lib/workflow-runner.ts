import { Node, Edge } from '@xyflow/react'
import { WorkflowRun, NodeExecutionResult } from '@/types/workflow'

// Check if Trigger.dev is configured
const hasTriggerKey = () => !!process.env.TRIGGER_SECRET_KEY

interface ExecutionContext {
  nodes: Node[]
  edges: Edge[]
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void
  addRunToHistory: (run: WorkflowRun) => void
}

// Removed local NodeResult - using NodeExecutionResult from types

// Get execution layers — nodes within a layer can run in parallel
function getExecutionLayers(nodes: Node[], edges: Edge[]): Node[][] {
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  nodes.forEach((n) => {
    inDegree.set(n.id, 0)
    adjacency.set(n.id, [])
  })

  edges.forEach((e) => {
    adjacency.get(e.source)?.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
  })

  const layers: Node[][] = []
  let remaining = new Set(nodes.map((n) => n.id))

  while (remaining.size > 0) {
    // Pick all nodes whose in-degree is 0
    const layer = Array.from(remaining)
      .filter((id) => (inDegree.get(id) || 0) === 0)
      .map((id) => nodes.find((n) => n.id === id)!)
      .filter(Boolean)

    if (layer.length === 0) break // cycle guard (shouldn't happen after DAG validation)

    layers.push(layer)

    layer.forEach((node) => {
      remaining.delete(node.id)
      adjacency.get(node.id)?.forEach((target) => {
        inDegree.set(target, (inDegree.get(target) || 1) - 1)
      })
    })
  }

  return layers
}

// Execute a single node
async function executeNode(
  node: Node,
  inputData: Record<string, unknown>,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const startTime = Date.now()
  const nodeType = node.type

  try {
    context.updateNodeData(node.id, { isRunning: true })

    let output: unknown = null

    switch (nodeType) {
      case 'text':
        // Text node just passes through its text
        output = node.data.text || ''
        break

      case 'upload-image':
        // Pass through the image data
        output = {
          type: 'image',
          url: node.data.imageUrl,
          data: node.data.imageData, // base64 data if available
          mimeType: node.data.mimeType,
        }
        break

      case 'upload-video':
        output = {
          type: 'video',
          url: node.data.videoUrl,
        }
        break

      case 'llm':
        // Call via Trigger.dev task (falls back to direct Gemini API)
        const llmData = node.data as Record<string, unknown>
        
        // Get input from connected nodes
        const imageInput = inputData.images as { data?: string; mimeType?: string } | undefined
        const textInput = inputData.user_message as string | undefined
        const systemInput = inputData.system_prompt as string | undefined

        const llmResponse = await fetch('/api/execute-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: 'run-llm',
            payload: {
              model: llmData.model || 'gemini-2.5-flash',
              systemPrompt: systemInput || llmData.systemPrompt || '',
              userMessage: textInput || String(llmData.userMessage || ''),
              imageData: imageInput?.data ? {
                data: imageInput.data,
                mimeType: imageInput.mimeType || 'image/jpeg',
              } : null,
            },
          }),
        })

        const llmTaskResult = await llmResponse.json()
        const llmResult = llmTaskResult.result as { success: boolean; output?: string; error?: string }
        
        if (!llmResult?.success) {
          throw new Error(llmResult?.error || 'LLM execution failed')
        }

        output = llmResult.output
        context.updateNodeData(node.id, { output: llmResult.output })
        break

      case 'crop-image':
        // Execute crop via Trigger.dev task
        const cropData = node.data as Record<string, unknown>
        const cropImageInput = (inputData.image_url || inputData.input) as { data?: string; url?: string } | undefined
        
        if (cropImageInput?.data) {
          const cropTaskResponse = await fetch('/api/execute-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: 'crop-image',
              payload: {
                imageData: cropImageInput.data,
                xPercent: cropData.xPercent || 0,
                yPercent: cropData.yPercent || 0,
                widthPercent: cropData.widthPercent || 100,
                heightPercent: cropData.heightPercent || 100,
              },
            }),
          })
          const cropTaskResult = await cropTaskResponse.json()
          const cropResult = cropTaskResult.result as { success: boolean; outputUrl?: string; error?: string }
          if (cropResult?.success && cropResult.outputUrl) {
            output = { type: 'image', data: cropResult.outputUrl }
            context.updateNodeData(node.id, { outputUrl: cropResult.outputUrl })
          } else {
            throw new Error(cropResult?.error || 'Crop failed')
          }
        } else {
          output = null
        }
        break

      case 'extract-frame':
        // Execute frame extraction via Trigger.dev task
        const extractData = node.data as Record<string, unknown>
        const videoInput = (inputData.video_url || inputData.input) as { url?: string; data?: string } | undefined
        
        if (videoInput) {
          const extractTaskResponse = await fetch('/api/execute-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: 'extract-frame',
              payload: {
                videoUrl: videoInput.url || videoInput.data || '',
                timestamp: extractData.timestamp || '0',
              },
            }),
          })
          const extractTaskResult = await extractTaskResponse.json()
          const extractResult = extractTaskResult.result as { success: boolean; outputUrl?: string; message?: string }
          if (extractResult?.outputUrl) {
            output = { type: 'image', data: extractResult.outputUrl }
            context.updateNodeData(node.id, { outputUrl: extractResult.outputUrl })
          } else {
            output = { message: extractResult?.message || 'Frame extraction pending' }
          }
        } else {
          output = null
        }
        break

      default:
        output = null
    }

    context.updateNodeData(node.id, { isRunning: false })

    return {
      nodeId: node.id,
      output,
      status: 'success',
      executionTime: Date.now() - startTime,
    }
  } catch (error) {
    context.updateNodeData(node.id, { isRunning: false })
    return {
      nodeId: node.id,
      output: null,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: Date.now() - startTime,
    }
  }
}

// Main workflow runner — executes nodes layer-by-layer, each layer runs in parallel
export async function runWorkflow(context: ExecutionContext): Promise<{
  success: boolean
  results: NodeExecutionResult[]
  totalDuration: number
}> {
  const startTime = Date.now()
  const { nodes, edges } = context
  const results: NodeExecutionResult[] = []
  const nodeOutputs = new Map<string, unknown>()

  // Get execution layers (each layer can run in parallel)
  const layers = getExecutionLayers(nodes, edges)

  // Execute layer by layer; within each layer run nodes concurrently
  for (const layer of layers) {
    const layerResults = await Promise.all(
      layer.map((node) => {
        // Gather inputs from connected nodes
        const inputData: Record<string, unknown> = {}
        edges
          .filter((e) => e.target === node.id)
          .forEach((edge) => {
            const sourceOutput = nodeOutputs.get(edge.source)
            const targetHandle = edge.targetHandle || 'input'
            inputData[targetHandle] = sourceOutput
          })
        return executeNode(node, inputData, context)
      }),
    )

    // Store results and outputs for the next layer
    layerResults.forEach((result) => {
      results.push(result)
      if (result.status === 'success') {
        nodeOutputs.set(result.nodeId, result.output)
      }
    })
  }

  const totalDuration = Date.now() - startTime
  const allSuccess = results.every((r) => r.status === 'success')

  // Add to history
  context.addRunToHistory({
    id: `run-${Date.now()}`,
    workflowId: 'current',
    runType: 'full',
    status: allSuccess ? 'success' : results.some((r) => r.status === 'success') ? 'partial' : 'failed',
    duration: totalDuration,
    nodeResults: results,
    startedAt: new Date(startTime),
    completedAt: new Date(),
  })

  return {
    success: allSuccess,
    results,
    totalDuration,
  }
}
