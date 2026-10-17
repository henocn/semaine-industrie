const MAX_BYTES = 5 * 1024 * 1024
const MIN_WIDTH = 1000
const MIN_HEIGHT = 700
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

/* Vérifie qu'un fichier est une image de bonne qualité. */
export async function assertGoodImage(file: File, index: number) {
  const n = index + 1
  if (!ALLOWED.includes(file.type)) {
    throw new Error(`Image ${n} : utilisez JPEG, PNG ou WebP`)
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Image ${n} : max 5 Mo`)
  }
  const { width, height } = await readDimensions(file)
  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    throw new Error(`Image ${n} : minimum ${MIN_WIDTH}×${MIN_HEIGHT} px (reçu ${width}×${height})`)
  }
}

/* Valide exactement 3 images. */
export async function assertGalleryFiles(files: File[]) {
  if (files.length !== 3) {
    throw new Error('Ajoutez exactement 3 images de bonne qualité')
  }
  for (let i = 0; i < files.length; i += 1) {
    await assertGoodImage(files[i], i)
  }
}
