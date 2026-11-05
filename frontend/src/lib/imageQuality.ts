/* 4 Mo décimaux : 3 photos restent sous la limite de 12 Mio de Nginx. */
const MAX_BYTES = 4 * 1000 * 1000
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

/* Vérifie qu'il y a exactement 3 images au bon format et sous 4 Mo chacune. */
export function checkGalleryFiles(files: File[]) {
  if (files.length !== 3) {
    throw new Error('Ajoutez exactement 3 images')
  }
  files.forEach((file, index) => {
    const n = index + 1
    if (!ALLOWED.includes(file.type)) {
      throw new Error(`Image ${n} : utilisez JPEG, PNG ou WebP`)
    }
    if (file.size > MAX_BYTES) {
      throw new Error(`Image ${n} : 4 Mo maximum par photo`)
    }
  })
}
