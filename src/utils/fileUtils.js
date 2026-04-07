/**
 * Returns the base name of a filename without its extension.
 * e.g. "recording.wav" → "recording", "recording" → "recording"
 */
export const baseName = (name) => (name ? name.replace(/\.[^/.]+$/, '') : '')
