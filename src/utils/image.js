// Profile picture validation + resizing. Runs in the browser before anything is uploaded.
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const AVATAR_MAX_INPUT = 10 * 1024 * 1024 // raw file the user picks
export const AVATAR_MIN_SIDE = 64
export const AVATAR_SIZE = 512 // stored image is a square this many px wide
const MAX_PIXELS = 60e6 // refuse absurdly large images instead of freezing the tab
const fail = (message) => Object.assign(new Error(message), { userMessage: message })

const load = (url) => new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(fail('That file could not be read as an image. Try a JPG, PNG or WebP photo.')); img.src = url })

// Returns { blob, previewUrl }. Throws an Error with a user-facing `userMessage`.
export async function prepareAvatar(file) {
  if (!file) throw fail('Choose a photo first.')
  if (!AVATAR_TYPES.includes(file.type)) throw fail('Use a JPG, PNG or WebP image.')
  if (file.size > AVATAR_MAX_INPUT) throw fail('That photo is larger than 10 MB. Choose a smaller one.')
  const src = URL.createObjectURL(file)
  try {
    const img = await load(src), w = img.naturalWidth, h = img.naturalHeight
    if (Math.min(w, h) < AVATAR_MIN_SIDE) throw fail(`The photo is too small. Use one at least ${AVATAR_MIN_SIDE} by ${AVATAR_MIN_SIDE} pixels.`)
    if (w * h > MAX_PIXELS) throw fail('That photo has too many pixels. Choose a smaller one.')
    // Centre-crop to a square, then scale down (never up).
    const side = Math.min(w, h), out = Math.min(AVATAR_SIZE, side), canvas = document.createElement('canvas')
    canvas.width = canvas.height = out
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out, out) // PNG transparency becomes white in the JPEG
    ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, out, out)
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.86))
    if (!blob) throw fail('We could not process that photo. Try a different one.')
    return { blob, previewUrl: URL.createObjectURL(blob) }
  } finally { URL.revokeObjectURL(src) }
}
