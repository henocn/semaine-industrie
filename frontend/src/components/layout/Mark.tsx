/* Symbole de la charte : trois feuilles qui montent. */
export function Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" className={className} aria-hidden="true" fill="currentColor">
      <path d="M4 28h10a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H8a6 6 0 0 1-6-6v-9a2 2 0 0 1 2-2z" />
      <path d="M27 16h9a3 3 0 0 1 3 3v4c0 10-8 18-18 18h-1a2 2 0 0 1-2-2v-6c0-9 3-17 9-17z" />
      <path d="M51 3h9a2 2 0 0 1 2 2v3c0 9-7 16-16 16h-2a2 2 0 0 1-2-2V17C42 9 45 3 51 3z" />
    </svg>
  )
}

export const WRAP = 'mx-auto w-full max-w-6xl px-5 sm:px-8'
