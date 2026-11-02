/* Même règle que le backend : « + » + indicatif + numéro, 8 à 15 chiffres. */
export const phoneInputProps = {
  type: 'tel',
  inputMode: 'tel',
  autoComplete: 'tel',
  pattern: '\\+([ .\\-]*[0-9]){8,15}',
  placeholder: '+228 90 12 34 56',
  title: 'Format : +indicatif puis le numéro, ex. +228 90 12 34 56',
} as const
