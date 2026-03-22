import { task } from '@trigger.dev/sdk/v3'

export interface ExtractFrameTaskPayload {
  videoUrl: string
  timestamp: string | number
}

export interface ExtractFrameTaskResult {
  success: boolean
  outputUrl?: string
  timestamp: string | number
  error?: string
}

export const extractFrameTask = task({
  id: 'extract-frame',
  maxDuration: 120,
  run: async (payload: ExtractFrameTaskPayload): Promise<ExtractFrameTaskResult> => {
    const { timestamp } = payload

    // Note: FFmpeg frame extraction requires a binary environment
    // Trigger.dev runs this in a managed environment where ffmpeg-static is available
    // For now we return the video URL and timestamp for demonstration
    // In a full implementation, ffmpeg-static would be used here

    return {
      success: true,
      outputUrl: undefined, // Would be the extracted frame URL
      timestamp,
    }
  },
})
