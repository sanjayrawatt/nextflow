import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const TRANSLOADIT_AUTH_KEY = process.env.TRANSLOADIT_AUTH_KEY || ''
const TRANSLOADIT_AUTH_SECRET = process.env.TRANSLOADIT_AUTH_SECRET || ''

function createTransloaditSignature(params: object): string {
  const message = JSON.stringify(params)
  return crypto
    .createHmac('sha384', TRANSLOADIT_AUTH_SECRET)
    .update(message)
    .digest('hex')
}

// POST /api/transloadit - Generate signed Transloadit params for client upload
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileType } = body // 'image' or 'video'

    const expires = new Date(Date.now() + 30 * 60 * 1000) // 30 min from now
    const expiresStr = expires.toISOString().replace('T', ' ').replace('Z', '+00:00')

    // Steps depend on file type
    const steps = fileType === 'video'
      ? {
          store: {
            use: ':original',
            robot: '/file/store',
            credentials: null,
          }
        }
      : {
          compress: {
            use: ':original',
            robot: '/image/resize',
            result: true,
            width: 2000,
            height: 2000,
            resize_strategy: 'fit',
            imagemagick_stack: 'v3.0.0',
          }
        }

    const params = {
      auth: {
        key: TRANSLOADIT_AUTH_KEY,
        expires: expiresStr,
      },
      steps,
    }

    const signature = createTransloaditSignature(params)

    return NextResponse.json({
      success: true,
      params: JSON.stringify(params),
      signature: `sha384:${signature}`,
    })
  } catch (error) {
    console.error('Transloadit signature error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate upload signature' },
      { status: 500 }
    )
  }
}
