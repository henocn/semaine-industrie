/*
 * Remplace leaflet pendant le pré-rendu (Node) : la bibliothèque touche `window` dès son import.
 * Les cartes ne sont créées que dans des effets, jamais exécutés au rendu serveur ;
 * ce proxy absorbe tout accès ou appel éventuel au niveau module.
 */
const handler: ProxyHandler<() => void> = {
  get: (_target, prop) => (prop === Symbol.toPrimitive ? () => '' : stub),
  apply: () => stub,
  construct: () => stub as object,
}
const stub: unknown = new Proxy(function leafletStub() {}, handler)

export default stub
