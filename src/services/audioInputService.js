const getCapacitorPlugins = () => globalThis?.Capacitor?.Plugins || null

export const isNativePlatform = () => Boolean(globalThis?.Capacitor?.isNativePlatform?.())

export const getAudioRecorderCapabilities = () => {
  const plugins = getCapacitorPlugins()
  return {
    hasWebRecorder: typeof MediaRecorder !== 'undefined' && Boolean(navigator?.mediaDevices?.getUserMedia),
    hasNativeRecorder:
      Boolean(plugins?.AudioRecorder?.startRecording) ||
      Boolean(plugins?.VoiceRecorder?.startRecording)
  }
}

export const requestMicrophoneStream = async () => navigator.mediaDevices.getUserMedia({ audio: true })

export const resolvePreferredMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return ''
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  return ''
}

export const createBrowserRecorder = (stream) => {
  const mimeType = resolvePreferredMimeType()
  return mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream)
}
