import { useState, type FormEvent } from 'react'
import { createLabelRequest } from '../api/labels'
import { WRAP } from '../components/layout/Mark'

const field =
  'mt-2 w-full border-0 border-b border-forest/25 bg-transparent px-0 py-3 text-lg text-ink placeholder:text-ink/35 focus:border-forest focus:outline-none focus:ring-0'

/* Page publique de demande de label. */
export default function LabelRequestPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [structureType, setStructureType] = useState<'entreprise' | 'ecole'>('entreprise')
  const isEntreprise = structureType === 'entreprise'

  /* Soumet le formulaire vers l'API. */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const productsRaw = String(fd.get('products') || '')
    const products = isEntreprise
      ? productsRaw
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : []

    try {
      await createLabelRequest({
        structure_name: String(fd.get('structure_name') || ''),
        structure_type: structureType,
        sector: isEntreprise ? String(fd.get('sector') || '') || undefined : undefined,
        region: String(fd.get('region') || '') || undefined,
        city: String(fd.get('city') || '') || undefined,
        address: String(fd.get('address') || '') || undefined,
        contact_name: String(fd.get('contact_name') || ''),
        contact_email: String(fd.get('contact_email') || ''),
        contact_phone: String(fd.get('contact_phone') || ''),
        description: String(fd.get('description') || '') || undefined,
        products,
        max_visitors: isEntreprise && fd.get('max_visitors') ? Number(fd.get('max_visitors')) : null,
        safety_rules: isEntreprise ? String(fd.get('safety_rules') || '') || undefined : undefined,
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="py-16 sm:py-24">
        <div className={`${WRAP} grid gap-14 md:grid-cols-[1fr_1.15fr]`}>
          <div>
            <h1 className="display text-4xl sm:text-5xl">Demander le label</h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/70">
              Entreprises et écoles : déposez votre dossier en ligne. L’équipe valide, puis le kit et la fiche publique suivent.
            </p>
            <p className="mt-4 max-w-md text-[15px] text-ink/55">
              Sans accès web, l’organisation peut aussi saisir la demande pour vous lors d’un appel.
            </p>
          </div>

          {sent ? (
            <p className="self-center text-xl text-forest">
              Merci. Votre demande est enregistrée. Vous serez contacté après validation.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-8 sm:grid-cols-2">
              <label className="block text-[15px] font-medium text-forest sm:col-span-2">
                Nom de la structure
                <input required name="structure_name" className={field} />
              </label>
              <label className="block text-[15px] font-medium text-forest sm:col-span-2">
                Type
                <select
                  name="structure_type"
                  className={field}
                  value={structureType}
                  onChange={(e) => setStructureType(e.target.value as 'entreprise' | 'ecole')}
                >
                  <option value="entreprise">Entreprise</option>
                  <option value="ecole">École</option>
                </select>
              </label>
              {isEntreprise && (
                <label className="block text-[15px] font-medium text-forest sm:col-span-2">
                  Secteur
                  <input name="sector" className={field} />
                </label>
              )}
              <label className="block text-[15px] font-medium text-forest">
                Région
                <input name="region" className={field} />
              </label>
              <label className="block text-[15px] font-medium text-forest">
                Ville
                <input name="city" className={field} />
              </label>
              <label className="block text-[15px] font-medium text-forest sm:col-span-2">
                Adresse
                <input name="address" className={field} />
              </label>
              <label className="block text-[15px] font-medium text-forest">
                Référent
                <input required name="contact_name" className={field} />
              </label>
              <label className="block text-[15px] font-medium text-forest">
                E-mail
                <input required type="email" name="contact_email" className={field} />
              </label>
              <label className={`block text-[15px] font-medium text-forest ${isEntreprise ? '' : 'sm:col-span-2'}`}>
                Téléphone
                <input required name="contact_phone" type="tel" className={field} />
              </label>
              {isEntreprise && (
                <label className="block text-[15px] font-medium text-forest">
                  Capacité max. visiteurs
                  <input type="number" min={1} name="max_visitors" className={field} />
                </label>
              )}
              {isEntreprise && (
                <label className="block text-[15px] font-medium text-forest sm:col-span-2">
                  Produits phares (séparés par des virgules)
                  <input name="products" placeholder="farine, huile…" className={field} />
                </label>
              )}
              <label className="block text-[15px] font-medium text-forest sm:col-span-2">
                Description
                <textarea name="description" rows={3} className={`${field} resize-none`} />
              </label>
              {isEntreprise && (
                <label className="block text-[15px] font-medium text-forest sm:col-span-2">
                  Règles de sécurité
                  <textarea name="safety_rules" rows={3} className={`${field} resize-none`} />
                </label>
              )}

              {error && <p className="text-[15px] text-red-700 sm:col-span-2">{error}</p>}

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-forest px-8 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-ink disabled:opacity-60"
                >
                  {loading ? 'Envoi…' : 'Envoyer la demande'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
  )
}
