import { TextNode } from './text-node'
import { UploadImageNode } from './upload-image-node'
import { UploadVideoNode } from './upload-video-node'
import { LLMNode } from './llm-node'
import { CropImageNode } from './crop-image-node'
import { ExtractFrameNode } from './extract-frame-node'

export const nodeTypes = {
  text: TextNode,
  'upload-image': UploadImageNode,
  'upload-video': UploadVideoNode,
  llm: LLMNode,
  'crop-image': CropImageNode,
  'extract-frame': ExtractFrameNode,
}

export {
  TextNode,
  UploadImageNode,
  UploadVideoNode,
  LLMNode,
  CropImageNode,
  ExtractFrameNode,
}
