import { lazy, Suspense } from 'react'
import type { PhoneFieldProps } from './PhoneFieldInput'

/* Drapeaux + règles par pays (~100 Ko) chargés seulement sur les pages avec un téléphone. */
const PhoneFieldInput = lazy(() => import('./PhoneFieldInput'))

/* Champ téléphone international ; simple champ désactivé le temps du chargement. */
export function PhoneField(props: PhoneFieldProps) {
  return (
    <Suspense fallback={<input disabled placeholder="+228" className={props.className} />}>
      <PhoneFieldInput {...props} />
    </Suspense>
  )
}
