const DAYS_LABEL = {
  public: 'du lundi 16 au vendredi 20 novembre',
  industrie: 'du lundi 16 au vendredi 20 novembre',
}

/* Rappel discret des jours de visite, sous l'introduction d'un formulaire d'inscription. */
export function VisitDaysNote({ audience }: { audience: keyof typeof DAYS_LABEL }) {
  return <p className="mt-3 text-[14px] text-ink/60">Jours de visite : {DAYS_LABEL[audience]}.</p>
}
