import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { geminiRequestSchema, validateRequest } from '@/lib/validations'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    // Validate request body with Zod
    const validation = await validateRequest(request, geminiRequestSchema)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const { systemPrompt, userMessage, imageData } = validation.data

    // Use Gemini 2.5 Flash - current free tier model
    const modelName = 'gemini-2.5-flash'
    
    console.log('Using Gemini model:', modelName)
    
    const model = genAI.getGenerativeModel({ model: modelName })

    // Build the prompt parts
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []

    // Add system prompt if provided
    if (systemPrompt) {
      parts.push({ text: `Instructions: ${systemPrompt}\n\n` })
    }

    // Add image if provided
    if (imageData && imageData.data) {
      const mimeType = imageData.mimeType || 'image/jpeg'
      const base64Data = imageData.data.replace(/^data:image\/\w+;base64,/, '')
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      })
    }

    // Add user message
    if (userMessage) {
      parts.push({ text: String(userMessage) })
    } else if (!imageData) {
      parts.push({ text: 'Please respond.' })
    } else {
      parts.push({ text: 'Describe this image.' })
    }

    console.log('Sending to Gemini:', parts.length, 'parts')

    // Generate content
    const result = await model.generateContent(parts)
    const response = await result.response
    const text = response.text()

    console.log('Gemini response:', text.substring(0, 100))

    return NextResponse.json({
      success: true,
      output: text,
      model: modelName,
    })
  } catch (error) {
    console.error('Gemini API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate content',
      },
      { status: 500 }
    )
  }
}
