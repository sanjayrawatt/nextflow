import { create } from 'zustand'
import { Node, Edge, Connection, addEdge } from '@xyflow/react'
import { NodeType, WorkflowRun } from '@/types/workflow'

const MAX_HISTORY = 50

interface HistoryState {
  nodes: Node[]
  edges: Edge[]
}

interface WorkflowState {
  nodes: Node[]
  edges: Edge[]
  selectedNodes: string[]
  workflowId: string | null
  workflowName: string
  isRunning: boolean
  runHistory: WorkflowRun[]
  
  // Undo/Redo history
  history: HistoryState[]
  historyIndex: number
  
  // Actions
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  addNode: (type: NodeType, position: { x: number; y: number }) => void
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void
  deleteNode: (nodeId: string) => void
  onConnect: (connection: Connection) => void
  deleteEdge: (edgeId: string) => void
  setSelectedNodes: (nodeIds: string[]) => void
  setWorkflowId: (id: string | null) => void
  setWorkflowName: (name: string) => void
  setIsRunning: (isRunning: boolean) => void
  loadWorkflow: (nodes: Node[], edges: Edge[], name: string, id?: string) => void
  clearWorkflow: () => void
  loadSampleWorkflow: () => void
  addRunToHistory: (run: WorkflowRun) => void
  
  // Undo/Redo actions
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  pushToHistory: () => void
}

const createDefaultNodeData = (type: NodeType): Record<string, unknown> => {
  switch (type) {
    case 'text':
      return { text: '' }
    case 'upload-image':
      return { imageUrl: null, fileName: null }
    case 'upload-video':
      return { videoUrl: null, fileName: null }
    case 'llm':
      return { 
        model: 'gemini-2.5-flash',
        systemPrompt: '',
        userMessage: '',
        output: null,
        isRunning: false
      }
    case 'crop-image':
      return {
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 100,
        outputUrl: null,
        isRunning: false
      }
    case 'extract-frame':
      return {
        timestamp: '0',
        outputUrl: null,
        isRunning: false
      }
    default:
      return {}
  }
}

// Pre-built sample workflow: Product Marketing Kit Generator
// Demonstrates all 6 node types with parallel branches converging at a final LLM
export const SAMPLE_WORKFLOW = {
  name: 'Product Marketing Kit Generator',
  nodes: [
    // ── Branch A: Image ─────────────────────────────────────────────
    {
      id: 's-upload-image',
      type: 'upload-image' as NodeType,
      position: { x: 60, y: 60 },
      data: { imageUrl: null, fileName: null },
    },
    {
      id: 's-crop-image',
      type: 'crop-image' as NodeType,
      position: { x: 340, y: 60 },
      data: {
        xPercent: 10,
        yPercent: 10,
        widthPercent: 80,
        heightPercent: 80,
        outputUrl: null,
        isRunning: false,
      },
    },
    {
      id: 's-text-product',
      type: 'text' as NodeType,
      position: { x: 60, y: 320 },
      data: { text: 'Sleek wireless headphones with 40-hour battery life, active noise cancellation, and premium sound quality. Target audience: remote workers and music lovers.' },
    },
    {
      id: 's-text-style',
      type: 'text' as NodeType,
      position: { x: 60, y: 510 },
      data: { text: 'You are an expert marketing copywriter. Write punchy, benefit-focused product descriptions under 80 words. Include an emoji bullet list of 3 key features.' },
    },
    {
      id: 's-llm-desc',
      type: 'llm' as NodeType,
      position: { x: 620, y: 260 },
      data: {
        model: 'gemini-2.5-flash',
        systemPrompt: '',
        userMessage: '',
        output: null,
        isRunning: false,
      },
    },
    // ── Branch B: Video ─────────────────────────────────────────────
    {
      id: 's-upload-video',
      type: 'upload-video' as NodeType,
      position: { x: 60, y: 750 },
      data: { videoUrl: null, fileName: null },
    },
    {
      id: 's-extract-frame',
      type: 'extract-frame' as NodeType,
      position: { x: 340, y: 750 },
      data: { timestamp: '3', outputUrl: null, isRunning: false },
    },
    // ── Convergence LLM ─────────────────────────────────────────────
    {
      id: 's-llm-final',
      type: 'llm' as NodeType,
      position: { x: 940, y: 480 },
      data: {
        model: 'gemini-2.5-flash',
        systemPrompt: 'You are a senior marketing strategist. Given a product description and a product image analysis, write a compelling 3-sentence tagline and a 5-point social media post for Instagram.',
        userMessage: '',
        output: null,
        isRunning: false,
      },
    },
  ] as Node[],
  edges: [
    // Image → Crop
    { id: 'se-1', source: 's-upload-image', sourceHandle: 'output', target: 's-crop-image', targetHandle: 'image_url', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 } },
    // Crop → LLM desc (images)
    { id: 'se-2', source: 's-crop-image', sourceHandle: 'output', target: 's-llm-desc', targetHandle: 'images', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 } },
    // Text product → LLM desc (user_message)
    { id: 'se-3', source: 's-text-product', sourceHandle: 'output', target: 's-llm-desc', targetHandle: 'user_message', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 } },
    // Text style → LLM desc (system_prompt)
    { id: 'se-4', source: 's-text-style', sourceHandle: 'output', target: 's-llm-desc', targetHandle: 'system_prompt', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 } },
    // Video → Extract Frame
    { id: 'se-5', source: 's-upload-video', sourceHandle: 'output', target: 's-extract-frame', targetHandle: 'video_url', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 } },
    // LLM desc output → Final LLM (user_message)
    { id: 'se-6', source: 's-llm-desc', sourceHandle: 'output', target: 's-llm-final', targetHandle: 'user_message', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 } },
    // Extract Frame → Final LLM (images)
    { id: 'se-7', source: 's-extract-frame', sourceHandle: 'output', target: 's-llm-final', targetHandle: 'images', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 } },
  ] as Edge[],
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodes: [],
  workflowId: null,
  workflowName: 'Untitled Workflow',
  isRunning: false,
  runHistory: [],
  history: [],
  historyIndex: -1,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (type, position) => {
    // Push current state to history before adding node
    get().pushToHistory()
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: createDefaultNodeData(type),
    }
    set((state) => ({ nodes: [...state.nodes, newNode] }))
  },

  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ),
    }))
  },

  deleteNode: (nodeId) => {
    // Push current state to history before deleting node
    get().pushToHistory()
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
    }))
  },

  onConnect: (connection) => {
    // Push current state to history before connecting
    get().pushToHistory()
    set((state) => ({
      edges: addEdge(
        { ...connection, animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 } },
        state.edges
      ),
    }))
  },

  deleteEdge: (edgeId) => {
    // Push current state to history before deleting edge
    get().pushToHistory()
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
    }))
  },

  setSelectedNodes: (nodeIds) => set({ selectedNodes: nodeIds }),
  setWorkflowId: (id) => set({ workflowId: id }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setIsRunning: (isRunning) => set({ isRunning }),

  loadWorkflow: (nodes, edges, name, id) => {
    set({
      nodes,
      edges,
      workflowName: name,
      workflowId: id || null,
      selectedNodes: [],
    })
  },

  clearWorkflow: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodes: [],
      workflowId: null,
      workflowName: 'Untitled Workflow',
    })
  },

  loadSampleWorkflow: () => {
    set({
      nodes: SAMPLE_WORKFLOW.nodes,
      edges: SAMPLE_WORKFLOW.edges,
      workflowName: SAMPLE_WORKFLOW.name,
      workflowId: null,
      selectedNodes: [],
      history: [],
      historyIndex: -1,
    })
  },

  addRunToHistory: (run) => {
    set((state) => ({
      runHistory: [run, ...state.runHistory],
    }))
  },

  // Push current state to history (call before making changes)
  pushToHistory: () => {
    const { nodes, edges, history, historyIndex } = get()
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1)
    // Add current state
    newHistory.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) })
    // Limit history size
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift()
    }
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },

  undo: () => {
    const { history, historyIndex, nodes, edges } = get()
    if (historyIndex < 0) return
    
    // Save current state if we're at the latest position
    if (historyIndex === history.length - 1) {
      const newHistory = [...history]
      newHistory.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) })
      set({ history: newHistory })
    }
    
    const prevState = history[historyIndex]
    if (prevState) {
      set({
        nodes: JSON.parse(JSON.stringify(prevState.nodes)),
        edges: JSON.parse(JSON.stringify(prevState.edges)),
        historyIndex: historyIndex - 1,
      })
    }
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    
    const nextState = history[historyIndex + 2] || history[historyIndex + 1]
    if (nextState) {
      set({
        nodes: JSON.parse(JSON.stringify(nextState.nodes)),
        edges: JSON.parse(JSON.stringify(nextState.edges)),
        historyIndex: historyIndex + 1,
      })
    }
  },

  canUndo: () => {
    const { historyIndex } = get()
    return historyIndex >= 0
  },

  canRedo: () => {
    const { history, historyIndex } = get()
    return historyIndex < history.length - 1
  },
}))
