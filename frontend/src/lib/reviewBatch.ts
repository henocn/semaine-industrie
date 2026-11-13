/* Acceptation / refus groupés : les lignes passent une à une, avec la même action (et les mêmes notifications) qu'à l'unité. */

export type ReviewStatus = 'approved' | 'rejected'
export type BatchFailure = { name: string; message: string }
export type BatchResult = { status: ReviewStatus; ok: number; total: number; failed: BatchFailure[] }

/* Traite les lignes l'une après l'autre ; un échec n'arrête pas le lot et est rapporté avec le nom de la ligne. */
export async function runReviewBatch<T>(
  rows: readonly T[],
  status: ReviewStatus,
  run: (row: T, status: ReviewStatus) => Promise<unknown>,
  name: (row: T) => string,
  onProgress: (done: number, total: number) => void,
): Promise<BatchResult> {
  const list = [...rows]
  const failed: BatchFailure[] = []
  onProgress(0, list.length)
  for (let i = 0; i < list.length; i += 1) {
    try {
      await run(list[i], status)
    } catch (err) {
      failed.push({ name: name(list[i]), message: err instanceof Error ? err.message : 'Action impossible' })
    }
    onProgress(i + 1, list.length)
  }
  return { status, ok: list.length - failed.length, total: list.length, failed }
}
