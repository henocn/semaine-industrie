import { Download, FileText } from 'lucide-react'

/* Nom du fichier enregistré : le titre et l'extension d'origine. */
function downloadName(title: string, url: string) {
  const extension = url.split('?')[0].match(/\.[a-z0-9]+$/i)?.[0] ?? ''
  return title.toLowerCase().endsWith(extension.toLowerCase()) ? title : `${title}${extension}`
}

/* Carte d'un document : son titre et le bouton de téléchargement. */
export function ResourceCard({ title, url }: { title: string; url: string }) {
  return (
    <li className="flex flex-col gap-4 border border-forest/15 bg-white p-4 transition-colors hover:border-forest/50">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center bg-sage text-forest">
          <FileText className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <p className="font-semibold leading-snug text-forest">{title}</p>
      </div>
      <a className="ui-btn-outline mt-auto w-full" href={url} download={downloadName(title, url)}>
        <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Télécharger
      </a>
    </li>
  )
}
