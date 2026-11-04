const DAYS_LABEL = {
  public: 'mardi 17 et jeudi 19 novembre',
  industrie: 'lundi 16, mardi 17 et jeudi 19 novembre',
}

/* Rappel discret des jours de visite, sous l'introduction d'un formulaire d'inscription. */
export function VisitDaysNote({ audience }: { audience: keyof typeof DAYS_LABEL }) {
  return <p className="mt-3 text-[14px] text-ink/60">Jours de visite : {DAYS_LABEL[audience]}.</p>
}
