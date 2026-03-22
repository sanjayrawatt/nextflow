import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { cropImageRequestSchema, validateRequest } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    // Validate request body with Zod
    const validation = await validateRequest(request, cropImageRequestSchema)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const { imageData, xPercent, yPercent, widthPercent, heightPercent } = validation.data

    // Extract base64 data
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata()
    const imgWidth = metadata.width || 0
    const imgHeight = metadata.height || 0

    // Calculate crop region in pixels
    const left = Math.round((xPercent / 100) * imgWidth)
    const top = Math.round((yPercent / 100) * imgHeight)
    const width = Math.round((widthPercent / 100) * imgWidth)
    const height = Math.round((heightPercent / 100) * imgHeight)

    // Ensure dimensions are valid
    const cropLeft = Math.max(0, Math.min(left, imgWidth - 1))
    const cropTop = Math.max(0, Math.min(top, imgHeight - 1))
    const cropWidth = Math.max(1, Math.min(width, imgWidth - cropLeft))
    const cropHeight = Math.max(1, Math.min(height, imgHeight - cropTop))

    // Crop the image
    const croppedBuffer = await sharp(imageBuffer)
      .extract({
        left: cropLeft,
        top: cropTop,
        width: cropWidth,
        height: cropHeight,
      })
      .png()
      .toBuffer()

    // Convert back to base64
    const croppedBase64 = `data:image/png;base64,${croppedBuffer.toString('base64')}`

    return NextResponse.json({
      success: true,
      outputUrl: croppedBase64,
      dimensions: {
        original: { width: imgWidth, height: imgHeight },
        cropped: { width: cropWidth, height: cropHeight },
      },
    })
  } catch (error) {
    console.error('Crop image error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to crop image' },
      { status: 500 }
    )
  }
}
