import { ref, onUnmounted } from 'vue'
import {
  createBrowserRecorder,
  getAudioRecorderCapabilities,
  requestMicrophoneStream
} from '../../../services/audioInputService'

export function useAudioRecorder({ isLockedRef, microphoneDeniedMessage }) {
  const isRecording = ref(false)
  const audioBlob = ref(null)
  const audioBlobUrl = ref(null)
  const recordingSeconds = ref(0)
  const recordError = ref('')
  const micStream = ref(null)

  let mediaRecorder = null
  let audioChunks = []
  let recordingTimer = null

  const releaseMicStream = () => {
    if (micStream.value) {
      micStream.value.getTracks().forEach(track => track.stop())
      micStream.value = null
    }
  }

  const stopRecording = (force = false) => {
    if (isLockedRef.value && !force) return
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    clearInterval(recordingTimer)
    recordingTimer = null
    isRecording.value = false
  }

  const discardRecording = (force = false) => {
    if (isLockedRef.value && !force) return
    stopRecording(force)
    if (audioBlobUrl.value) {
      URL.revokeObjectURL(audioBlobUrl.value)
      audioBlobUrl.value = null
    }
    audioBlob.value = null
    recordingSeconds.value = 0
    recordError.value = ''
  }

  const startRecording = async () => {
    if (isLockedRef.value) return
    recordError.value = ''
    audioChunks = []
    const capabilities = getAudioRecorderCapabilities()
    if (!capabilities.hasWebRecorder) {
      recordError.value = microphoneDeniedMessage.value
      return
    }
    try {
      micStream.value = await requestMicrophoneStream()
    } catch {
      recordError.value = microphoneDeniedMessage.value
      return
    }

    mediaRecorder = createBrowserRecorder(micStream.value)
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) audioChunks.push(event.data)
    }
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' })
      audioBlob.value = blob
      audioBlobUrl.value = URL.createObjectURL(blob)
      releaseMicStream()
    }

    mediaRecorder.start(250)
    isRecording.value = true
    recordingSeconds.value = 0
    recordingTimer = setInterval(() => { recordingSeconds.value++ }, 1000)
  }

  onUnmounted(() => {
    discardRecording(true)
    releaseMicStream()
  })

  return {
    isRecording,
    audioBlob,
    audioBlobUrl,
    recordingSeconds,
    recordError,
    micStream,
    startRecording,
    stopRecording,
    discardRecording,
    releaseMicStream
  }
}
