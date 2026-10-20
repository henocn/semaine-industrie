import { useState } from 'react'
import { Seo } from '../components/Seo'
import { ResourcesModal } from '../components/ResourcesModal'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'

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
      <div className="animate-rise">
        <SectionHeader
          level={1}
          eyebrow="Espace privé"
          title="Ressources labellisées"
          lead="Le code de suivi n'est pas public. Saisissez-le pour télécharger votre label et le programme officiel."
        />
        <div className="mt-8">
          <Button onClick={() => setOpen(true)}>Entrer mon code de suivi</Button>
        </div>
      </div>
      <ResourcesModal open={open} onClose={() => setOpen(false)} />
    </main>
  )
}
