import { ref } from 'vue'

const DEFAULT_PARALLEL_CHUNKS = 3
const LOW_END_PARALLEL_CHUNKS = 1
const MID_RANGE_PARALLEL_CHUNKS = 2
const MAX_CHUNK_RETRIES = 3
const BASE_RETRY_DELAY_MS = 350

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const getAdaptiveParallelChunks = () => {
  const deviceMemory = Number(navigator?.deviceMemory || 0)
  const networkType = String(navigator?.connection?.effectiveType || '')

  if (deviceMemory > 0 && deviceMemory <= 2) return LOW_END_PARALLEL_CHUNKS
  if (networkType === 'slow-2g' || networkType === '2g') return LOW_END_PARALLEL_CHUNKS
  if (networkType === '3g') return MID_RANGE_PARALLEL_CHUNKS
  return DEFAULT_PARALLEL_CHUNKS
}

export function useChunkUpload({ api, pipeline, assemblingSubstepText }) {
  const chunkUploadProgress = ref(0)
  const chunkUploadStep = ref('')

  const uploadFileChunked = async (file) => {
    const totalChunks = Math.ceil(file.size / api.CHUNK_SIZE)
    const parallelChunks = getAdaptiveParallelChunks()
    chunkUploadProgress.value = 0
    chunkUploadStep.value = 'uploading'

    const { upload_id } = await api.initChunkedUpload(file.name, totalChunks, file.size)
    const { received_chunks: alreadyReceived = [] } = await api.getUploadStatus(upload_id)
    const receivedSet = new Set(alreadyReceived)
    const pending = Array.from({ length: totalChunks }, (_, i) => i).filter(i => !receivedSet.has(i))
    let uploaded = alreadyReceived.length

    for (let i = 0; i < pending.length; i += parallelChunks) {
      const batch = pending.slice(i, i + parallelChunks)
      await Promise.all(batch.map(async (chunkIndex) => {
        const start = chunkIndex * api.CHUNK_SIZE
        const end = Math.min(start + api.CHUNK_SIZE, file.size)
        const blob = file.slice(start, end)

        let lastError
        for (let attempt = 0; attempt < MAX_CHUNK_RETRIES; attempt++) {
          try {
            await api.uploadChunk(upload_id, chunkIndex, blob)
            uploaded++
            chunkUploadProgress.value = Math.round((uploaded / totalChunks) * 90)
            return
          } catch (error) {
            lastError = error
            if (attempt < MAX_CHUNK_RETRIES - 1) {
              await sleep(BASE_RETRY_DELAY_MS * (attempt + 1))
            }
          }
        }

        throw lastError
      }))
    }

    pipeline.currentSubStep = assemblingSubstepText.value
    chunkUploadStep.value = 'assembling'
    chunkUploadProgress.value = 95
    const result = await api.completeChunkedUpload(upload_id)
    chunkUploadProgress.value = 100
    chunkUploadStep.value = ''
    return result
  }

  return {
    chunkUploadProgress,
    chunkUploadStep,
    uploadFileChunked
  }
}
