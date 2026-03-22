import { task } from '@trigger.dev/sdk/v3'
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface LLMTaskPayload {
  model: string
  systemPrompt?: string
  userMessage?: string
  imageData?: {
    data: string
    mimeType: string
  } | null
}

export interface LLMTaskResult {
  success: boolean
  output?: string
  error?: string
  model: string
}

export const runLLMTask = task({
  id: 'run-llm',
  maxDuration: 120, // 2 minutes
  run: async (payload: LLMTaskPayload): Promise<LLMTaskResult> => {
    const { model, systemPrompt, userMessage, imageData } = payload

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')
    const modelName = model || 'gemini-2.5-flash'
    const geminiModel = genAI.getGenerativeModel({ model: modelName })

    // Build prompt parts
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []

    if (systemPrompt) {
      parts.push({ text: `Instructions: ${systemPrompt}\n\n` })
    }

    if (imageData?.data) {
      const mimeType = imageData.mimeType || 'image/jpeg'
      const base64Data = imageData.data.replace(/^data:image\/\w+;base64,/, '')
      parts.push({ inlineData: { mimeType, data: base64Data } })
    }

    if (userMessage) {
      parts.push({ text: String(userMessage) })
    } else if (!imageData) {
      parts.push({ text: 'Please respond.' })
    } else {
      parts.push({ text: 'Describe this image.' })
    }

    const result = await geminiModel.generateContent(parts)
    const response = await result.response
    const text = response.text()

    return {
      success: true,
      output: text,
      model: modelName,
    }
  },
})
