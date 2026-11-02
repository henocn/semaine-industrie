import { useEffect, useRef, useState } from 'react'
import PhoneInput, { isValidPhoneNumber, parsePhoneNumber } from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import fr from 'react-phone-number-input/locale/fr'
import 'react-phone-number-input/style.css'

export type PhoneFieldProps = {
  name: string
  defaultValue?: string | null
  required?: boolean
  /* Classes du champ texte de la page ; le focus s'applique au bloc entier. */
  className?: string
}

/* Relit un numéro enregistré (avec ou sans indicatif) au format international. */
function toInternational(raw?: string | null) {
  if (!raw) return undefined
  try {
    return parsePhoneNumber(raw, 'TG')?.number
  } catch {
    return undefined
  }
}

/* Téléphone : pays avec drapeau, mise en forme à la saisie ; envoie +22890123456 via un champ caché. */
export default function PhoneFieldInput({ name, defaultValue, required = false, className = '' }: PhoneFieldProps) {
  const [value, setValue] = useState(() => toInternational(defaultValue))
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let message = ''
    if (value && !isValidPhoneNumber(value)) message = 'Numéro invalide pour le pays choisi.'
    else if (!value && required) message = 'Renseignez un numéro de téléphone.'
    boxRef.current?.querySelector<HTMLInputElement>('.PhoneInputInput')?.setCustomValidity(message)
  }, [value, required])

  return (
    <div ref={boxRef}>
      <PhoneInput
        international
        countryCallingCodeEditable={false}
        defaultCountry="TG"
        labels={fr}
        flags={flags}
        value={value}
        onChange={setValue}
        autoComplete="tel"
        className={`${className.replaceAll('focus:', 'focus-within:')} flex items-center gap-2`}
        numberInputProps={{ className: 'min-w-0 flex-1 border-0 bg-transparent p-0 outline-none' }}
      />
      <input type="hidden" name={name} value={value ?? ''} />
    </div>
  )
}
