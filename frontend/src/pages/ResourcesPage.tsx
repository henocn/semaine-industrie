import { useEffect, useState } from 'react'
import { listResources, type GlobalResource } from '../api/resources'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { ResourcesModal } from '../components/ResourcesModal'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'

/* Page publique : accès aux PDF via code de suivi. */
export default function ResourcesPage() {
  const [open, setOpen] = useState(false)
  const [docs, setDocs] = useState<GlobalResource[]>([])

  useEffect(() => {
    listResources().then(setDocs).catch(() => setDocs([]))
  }, [])

  return (
    <main className={`${WRAP} pb-20 pt-16 sm:pt-24`}>
      <Seo {...publicSeo('/ressources')} />
      <div className="animate-rise">
        <SectionHeader
          level={1}
          eyebrow="Espace privé"
          title="Ressources labellisées"
          lead="Les documents de la semaine sont ouverts à tous. Le code de suivi sert pour votre label."
        />
        {docs.length > 0 && (
          <ul className="mt-8 divide-y divide-forest/10 border border-forest/15 bg-white">
            {docs.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                <div>
                  <p className="font-semibold text-forest">{doc.title}</p>
                  {doc.is_primary && (
                    <p className="mt-1 text-[13px] text-ink/50">Programme de la semaine</p>
                  )}
                </div>
                <a className="ui-btn-outline" href={doc.file_url} target="_blank" rel="noreferrer">
                  Télécharger
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8">
          <Button onClick={() => setOpen(true)}>Entrer mon code de suivi</Button>
        </div>
      </div>
      <ResourcesModal open={open} onClose={() => setOpen(false)} />
    </main>
  )
}
