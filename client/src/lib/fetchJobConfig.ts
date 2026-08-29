import { API } from './api';
import type { JobPosition } from './jobPositions';

export type PublicJobConfig = {
  positions: JobPosition[];
  requiredDocs: string[];
  applicantRequirements: string[];
};

export async function fetchJobConfig(signal?: AbortSignal): Promise<PublicJobConfig | null> {
  const res = await fetch(`${API}/api/job-config?t=${Date.now()}`, {
    method: 'GET',
    signal,
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !Array.isArray(data.positions)) return null;
  return {
    positions: data.positions,
    requiredDocs: data.requiredDocs || [],
    applicantRequirements: data.applicantRequirements || [],
  };
}
