import { useState } from 'react'
import { Seo } from '../components/Seo'
import { ResourcesModal } from '../components/ResourcesModal'
import { WRAP } from '../components/layout/Mark'

/* Page publique : accès aux PDF via code de suivi. */
export default function ResourcesPage() {
  const [open, setOpen] = useState(true)

  return (
    <main className={`${WRAP} pb-20 pt-16 sm:pt-24`}>
      <Seo
        title="Ressources"
        description="Téléchargez votre label et le programme avec votre code de suivi."
        path="/ressources"
      />
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-sun">Privé</p>
      <h1 className="display mt-3 text-4xl sm:text-5xl">Ressources labellisées</h1>
      <p className="mt-4 max-w-xl text-lg text-ink/65">
        Le code de suivi n&apos;est pas public. Saisissez-le pour télécharger votre label et le
        programme officiel.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-8 bg-forest px-6 py-3 text-[14px] font-semibold text-white"
      >
        Entrer mon code de suivi
      </button>
      <ResourcesModal open={open} onClose={() => setOpen(false)} />
    </main>
  )
}
