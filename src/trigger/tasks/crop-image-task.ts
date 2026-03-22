import { task } from '@trigger.dev/sdk/v3'
import sharp from 'sharp'

export interface CropImageTaskPayload {
  imageData: string  // base64 image data
  xPercent: number
  yPercent: number
  widthPercent: number
  heightPercent: number
}

export interface CropImageTaskResult {
  success: boolean
  outputUrl?: string
  dimensions?: {
    original: { width: number; height: number }
    cropped: { width: number; height: number }
  }
  error?: string
}

export const cropImageTask = task({
  id: 'crop-image',
  maxDuration: 60,
  run: async (payload: CropImageTaskPayload): Promise<CropImageTaskResult> => {
    const { imageData, xPercent, yPercent, widthPercent, heightPercent } = payload

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

    // Ensure valid dimensions
    const cropLeft = Math.max(0, Math.min(left, imgWidth - 1))
    const cropTop = Math.max(0, Math.min(top, imgHeight - 1))
    const cropWidth = Math.max(1, Math.min(width, imgWidth - cropLeft))
    const cropHeight = Math.max(1, Math.min(height, imgHeight - cropTop))

    // Crop the image
    const croppedBuffer = await sharp(imageBuffer)
      .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
      .png()
      .toBuffer()

    const croppedBase64 = `data:image/png;base64,${croppedBuffer.toString('base64')}`

    return {
      success: true,
      outputUrl: croppedBase64,
      dimensions: {
        original: { width: imgWidth, height: imgHeight },
        cropped: { width: cropWidth, height: cropHeight },
      },
    }
  },
})
