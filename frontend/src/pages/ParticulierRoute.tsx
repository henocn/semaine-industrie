import { useEffect, useState } from 'react'
import { getPublicForms } from '../api/participations'
import ClosedFormPage from './ClosedFormPage'
import InscriptionParticulierPage from './InscriptionParticulierPage'

/* /inscription-particulier : le formulaire si les inscriptions sont ouvertes dans les Paramètres, sinon « Inscriptions clôturées ». */
export default function ParticulierRoute() {
  const [open, setOpen] = useState<boolean | null>(null)

  useEffect(() => {
    getPublicForms()
      .then((data) => setOpen(data.particulier_open))
      .catch(() => setOpen(false))
  }, [])

  if (open === null) return <main className="min-h-[60vh]" aria-busy="true" />
  if (open) return <InscriptionParticulierPage />
  return <ClosedFormPage path="/inscription-particulier" subject="Les inscriptions des particuliers aux visites d’usines" />
}
