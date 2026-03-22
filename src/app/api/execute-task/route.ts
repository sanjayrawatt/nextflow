import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import sharp from 'sharp'
import crypto from 'crypto'

const TRIGGER_SECRET_KEY = process.env.TRIGGER_SECRET_KEY

// Trigger a task via Trigger.dev SDK and wait for result
async function triggerAndWait(taskId: string, payload: unknown): Promise<unknown> {
  if (!TRIGGER_SECRET_KEY) {
    throw new Error('Trigger.dev not configured')
  }

  const { tasks } = await import('@trigger.dev/sdk/v3')
  const result = await tasks.triggerAndWait(taskId, payload as Record<string, unknown>, {})

  if (result.ok) {
    return result.output
  } else {
    throw new Error(`Task ${taskId} failed`)
  }
}

// Direct execution fallbacks
async function executeLLMDirect(payload: {
  model: string
  systemPrompt?: string
  userMessage?: string
  imageData?: { data: string; mimeType: string } | null
}) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')
  const modelName = payload.model || 'gemini-2.5-flash'
  const model = genAI.getGenerativeModel({ model: modelName })

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []

  if (payload.systemPrompt) {
    parts.push({ text: `Instructions: ${payload.systemPrompt}\n\n` })
  }

  if (payload.imageData?.data) {
    const mimeType = payload.imageData.mimeType || 'image/jpeg'
    const base64Data = payload.imageData.data.replace(/^data:image\/\w+;base64,/, '')
    parts.push({ inlineData: { mimeType, data: base64Data } })
  }

  parts.push({ text: payload.userMessage || (payload.imageData ? 'Describe this image.' : 'Please respond.') })

  const result = await model.generateContent(parts)
  const response = await result.response
  return { success: true, output: response.text(), model: modelName }
}

async function executeCropDirect(payload: {
  imageData: string
  xPercent: number
  yPercent: number
  widthPercent: number
  heightPercent: number
}) {
  const base64Data = payload.imageData.replace(/^data:image\/\w+;base64,/, '')
  const imageBuffer = Buffer.from(base64Data, 'base64')

  const metadata = await sharp(imageBuffer).metadata()
  const imgWidth = metadata.width || 0
  const imgHeight = metadata.height || 0

  const left = Math.round((payload.xPercent / 100) * imgWidth)
  const top = Math.round((payload.yPercent / 100) * imgHeight)
  const cropLeft = Math.max(0, Math.min(left, imgWidth - 1))
  const cropTop = Math.max(0, Math.min(top, imgHeight - 1))
  const cropWidth = Math.max(1, Math.min(Math.round((payload.widthPercent / 100) * imgWidth), imgWidth - cropLeft))
  const cropHeight = Math.max(1, Math.min(Math.round((payload.heightPercent / 100) * imgHeight), imgHeight - cropTop))

  const croppedBuffer = await sharp(imageBuffer)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .png()
    .toBuffer()

  return {
    success: true,
    outputUrl: `data:image/png;base64,${croppedBuffer.toString('base64')}`,
    dimensions: {
      original: { width: imgWidth, height: imgHeight },
      cropped: { width: cropWidth, height: cropHeight },
    },
  }
}

// Extract a video frame using Transloadit /video/thumbs robot with proper HMAC auth
async function executeExtractFrameDirect(payload: {
  videoUrl: string
  timestamp: string | number
}) {
  const authKey = process.env.TRANSLOADIT_AUTH_KEY
  const authSecret = process.env.TRANSLOADIT_AUTH_SECRET

  if (!authKey || !authSecret) {
    throw new Error('Transloadit credentials not configured')
  }

  // Parse timestamp — support seconds ("5") or percent ("50%")
  const ts = String(payload.timestamp || '0')
  const offsetValue = ts.endsWith('%')
    ? Math.min(100, Math.max(0, parseFloat(ts)))
    : Math.max(0, parseFloat(ts) || 0)

  // Expires 10 minutes from now (required by Transloadit)
  const expires = new Date(Date.now() + 10 * 60 * 1000)
  const expiresStr = expires.toISOString().replace('T', ' ').replace('Z', '+00:00')

  const params = {
    auth: {
      key: authKey,
      expires: expiresStr,
    },
    steps: {
      import_video: {
        robot: '/http/import',
        url: payload.videoUrl,
      },
      extract_frame: {
        robot: '/video/thumbs',
        use: 'import_video',
        count: 1,
        offsets: [offsetValue],
        format: 'jpg',
        width: 1280,
        height: 720,
        resize_strategy: 'fit',
      },
    },
  }

  const paramsStr = JSON.stringify(params)
  const signature = 'sha384:' + crypto
    .createHmac('sha384', authSecret)
    .update(paramsStr)
    .digest('hex')

  const formData = new FormData()
  formData.append('params', paramsStr)
  formData.append('signature', signature)

  const createRes = await fetch('https://api2.transloadit.com/assemblies', {
    method: 'POST',
    body: formData,
  })

  if (!createRes.ok) {
    const errText = await createRes.text()
    throw new Error(`Transloadit assembly creation failed: ${createRes.status} — ${errText.slice(0, 200)}`)
  }

  const assemblyData = await createRes.json()
  const assemblyUrl = assemblyData.assembly_url as string | undefined

  if (!assemblyUrl) {
    throw new Error(`No assembly URL — Transloadit response: ${JSON.stringify(assemblyData).slice(0, 300)}`)
  }

  // Poll until complete (max ~60s, 30 × 2s)
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000))
    const statusRes = await fetch(assemblyUrl)
    if (!statusRes.ok) continue
    const status = await statusRes.json()

    if (status.error) throw new Error(`Transloadit error: ${status.error} — ${status.message || ''}`)

    if (status.ok === 'ASSEMBLY_COMPLETED') {
      const results = status.results?.extract_frame as Array<{ ssl_url?: string; url?: string }> | undefined
      if (results && results.length > 0) {
        return {
          success: true,
          outputUrl: results[0].ssl_url || results[0].url,
          timestamp: payload.timestamp,
        }
      }
      throw new Error('No frame results in completed assembly')
    }

    // Still processing
    if (status.ok === 'REQUEST_ABORTED' || status.ok === 'ASSEMBLY_CANCELED') {
      throw new Error(`Assembly was aborted: ${status.message || ''}`)
    }
  }

  throw new Error('Frame extraction timed out after 60s')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, payload } = body

    if (!taskId || !payload) {
      return NextResponse.json(
        { success: false, error: 'taskId and payload are required' },
        { status: 400 }
      )
    }

    let result: unknown

    // Try Trigger.dev first, fall back to direct execution
    if (TRIGGER_SECRET_KEY) {
      try {
        result = await triggerAndWait(taskId, payload)
        return NextResponse.json({ success: true, result, executedVia: 'trigger.dev' })
      } catch (triggerError) {
        console.warn('Trigger.dev failed, falling back to direct execution:', triggerError)
      }
    }

    // Direct execution fallback
    switch (taskId) {
      case 'run-llm':
        result = await executeLLMDirect(payload)
        break
      case 'crop-image':
        result = await executeCropDirect(payload)
        break
      case 'extract-frame':
        result = await executeExtractFrameDirect(payload)
        break
      default:
        return NextResponse.json(
          { success: false, error: `Unknown task: ${taskId}` },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true, result, executedVia: 'direct' })
  } catch (error) {
    console.error('Task execution error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Task execution failed' },
      { status: 500 }
    )
  }
}
