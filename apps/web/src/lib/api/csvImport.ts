import type { components } from '@/types/api';

export type CsvImportResult = components['schemas']['CsvImportResult'];

const BASE = '/api/v1';

/**
 * Posts a CSV file to the import endpoint. Uses native FormData because the
 * shared `api` client serialises bodies as JSON.
 */
export async function importFeedingsCsv(
  babyId: string,
  file: File,
  opts: { dryRun?: boolean } = {},
): Promise<CsvImportResult> {
  const fd = new FormData();
  fd.append('file', file);
  const search = opts.dryRun ? '?dryRun=true' : '';
  const res = await fetch(`${BASE}/babies/${babyId}/feedings/import${search}`, {
    method: 'POST',
    body: fd,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw json ?? { title: 'Upload failed', status: res.status };
  return json as CsvImportResult;
}
