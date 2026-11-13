/* 4 Mo décimaux : bien sous la limite de 12 Mio de Nginx. */
const MAX_BYTES = 4 * 1000 * 1000
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

/* Vérifie qu'il y a une photo, au bon format et sous 4 Mo. */
export function checkGalleryFiles(files: File[]) {
  if (files.length !== 1) {
    throw new Error('Ajoutez une photo')
  }
  files.forEach((file, index) => {
    const n = index + 1
    if (!ALLOWED.includes(file.type)) {
      throw new Error(n > 1 ? `Image ${n} : utilisez JPEG, PNG ou WebP` : 'Photo : utilisez JPEG, PNG ou WebP')
    }
    if (file.size > MAX_BYTES) {
      throw new Error(n > 1 ? `Image ${n} : 4 Mo maximum par photo` : 'Photo : 4 Mo maximum')
    }
  })
}
