export const LABEL_PENDING_EVENT = 'si:label-pending-refresh'

/* Demande au shell orga de recalculer le badge « en attente ». */
export function notifyLabelPendingChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(LABEL_PENDING_EVENT))
}
