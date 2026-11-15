/* Lecture d'un QR dans une photo ou une capture : détecteur du navigateur s'il existe, sinon jsQR. */

type Detector = { detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]> }
type DetectorCtor = new (options: { formats: string[] }) => Detector

/* Charge l'image du fichier. */
function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image illisible'))
    }
    img.src = url
  })
}

/* Pixels de l'image, réduite si elle est très grande (photo de téléphone). */
function pixels(img: HTMLImageElement, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height)
}

/* Texte contenu dans le QR de l'image, ou null si aucun QR n'est lisible. */
export async function readQrImage(file: File): Promise<string | null> {
  const img = await loadImage(file)

  const Native = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector
  if (typeof Native === 'function') {
    try {
      const found = await new Native({ formats: ['qr_code'] }).detect(img)
      if (found[0]?.rawValue) return found[0].rawValue
    } catch {
      /* Détecteur indisponible : on passe à jsQR. */
    }
  }

  const { default: jsQR } = await import('jsqr')
  for (const side of [1200, 800, 1800]) {
    const data = pixels(img, side)
    if (!data) break
    const hit = jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' })
    if (hit?.data) return hit.data
  }
  return null
}

/* Code de suivi trouvé dans un texte (QR ou saisie) : « PA-7RQA ». */
export function trackingCodeFrom(text: string) {
  const match = text.toUpperCase().match(/\b(PA|JP|EC|MD|IN|AF)-?([A-Z0-9]{4})\b/)
  return match ? `${match[1]}-${match[2]}` : text.trim().toUpperCase()
}
