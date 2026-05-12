import { describe, it, expect } from 'vitest'

function beginProcessingLock(pipeline) {
  pipeline.isProcessing = true
}

function releaseProcessingLock(pipeline) {
  pipeline.isProcessing = false
}

function setUploadProcessingNotice() {
  return 'File uploaded successfully. Please wait a moment while the system processes your file.'
}

describe('Pipeline processing lock helpers', () => {
  it('locks processing actions while work is running', () => {
    const pipeline = { isProcessing: false }
    beginProcessingLock(pipeline)
    expect(pipeline.isProcessing).toBe(true)
  })

  it('releases processing actions when processing ends', () => {
    const pipeline = { isProcessing: true }
    releaseProcessingLock(pipeline)
    expect(pipeline.isProcessing).toBe(false)
  })
})

describe('Pipeline upload notice message', () => {
  it('uses the required post-upload processing message', () => {
    expect(setUploadProcessingNotice()).toBe(
      'File uploaded successfully. Please wait a moment while the system processes your file.'
    )
  })
})
