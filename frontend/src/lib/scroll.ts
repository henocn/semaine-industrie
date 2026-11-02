/* Remonte en haut tout de suite (ignore le scroll-behavior: smooth du CSS, qui se faisait interrompre). */
export function scrollToTopNow() {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
}
