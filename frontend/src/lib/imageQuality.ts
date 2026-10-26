const MAX_BYTES = 10 * 1024 * 1024
const MAX_EDGE = 2000
const JPEG_QUALITY = 0.82
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

/* Lit les dimensions d'un fichier image. */
function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image illisible'))
    }
    img.src = url
  })
}

/* Redimensionne et compresse une image côté client si besoin. */
async function compressImage(file: File, index: number): Promise<File> {
  const n = index + 1
  const { width, height } = await readDimensions(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height, 1))
  const targetW = Math.max(1, Math.round(width * scale))
  const targetH = Math.max(1, Math.round(height * scale))
  const needsResize = scale < 1
  const needsCompress = file.size > 2 * 1024 * 1024 || needsResize

  if (!needsCompress && file.size <= MAX_BYTES) return file

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error(`Image ${n} : lecture impossible`))
      el.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error(`Image ${n} : compression impossible`)
    ctx.drawImage(img, 0, 0, targetW, targetH)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error(`Image ${n} : compression échouée`))),
        'image/jpeg',
        JPEG_QUALITY,
      )
    })

    if (blob.size > MAX_BYTES) {
      throw new Error(`Image ${n} : trop volumineuse même après compression (max 10 Mo)`)
    }

    const base = file.name.replace(/\.[^.]+$/, '') || `photo-${n}`
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/* Vérifie le type et la taille, puis compresse si utile (pas de contrainte de dimensions). */
export async function prepareGalleryImage(file: File, index: number): Promise<File> {
  const n = index + 1
  if (!ALLOWED.includes(file.type)) {
    throw new Error(`Image ${n} : utilisez JPEG, PNG ou WebP`)
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Image ${n} : max 10 Mo avant compression`)
  }
  return compressImage(file, index)
}

/* Prépare exactement 3 images (type + taille raisonnable, compression client). */
export async function prepareGalleryFiles(files: File[]) {
  if (files.length !== 3) {
    throw new Error('Ajoutez exactement 3 images')
  }
  const out: File[] = []
  for (let i = 0; i < files.length; i += 1) {
    out.push(await prepareGalleryImage(files[i], i))
  }
  return out
}
