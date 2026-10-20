import { WRAP } from './Mark'

/* Bandeau institutionnel au-dessus du header : République togolaise, ministère, dates de la semaine. */
export function RepublicBanner() {
  return (
    <div className="bg-forest text-[11px] text-white/90 sm:text-[12px]">
      <div className={`${WRAP} flex h-8 items-center justify-between gap-3 sm:h-9`}>
        <p className="flex min-w-0 items-center gap-2">
          <img src="/images/armoiries.png" alt="" aria-hidden="true" className="h-5 w-auto shrink-0" />
          <span className="shrink-0 font-medium">République togolaise</span>
          <span className="h-3 w-px shrink-0 bg-white/30" aria-hidden="true" />
          <abbr title="Ministère délégué chargé de la Promotion des investissements, de l’Industrie et de la Souveraineté économique" className="shrink-0 no-underline sm:hidden">
            MDPISE
          </abbr>
          <span className="hidden truncate sm:inline md:hidden">Promotion des investissements</span>
          <span className="hidden truncate md:inline">
            Ministère de la Promotion des investissements et de l’Industrie
          </span>
        </p>
        <p className="shrink-0 font-medium">16 au 22 nov. 2026</p>
      </div>
    </div>
  )
}
