import { API } from './api';
import type { JobPosition } from './jobPositions';

export type PublicJobConfig = {
  positions: JobPosition[];
  requiredDocs: string[];
  applicantRequirements: string[];
};

export async function fetchJobConfig(signal?: AbortSignal): Promise<PublicJobConfig | null> {
  try {
    const res = await fetch(`${API}/api/job-config?t=${Date.now()}`, {
      method: 'GET',
      signal,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.positions) && data.positions.length > 0) {
        try { localStorage.setItem('job_config_cache', JSON.stringify({ ...data, savedAt: Date.now() })); } catch (e) {}
        return {
          positions: data.positions,
          requiredDocs: data.requiredDocs || [],
          applicantRequirements: data.applicantRequirements || [],
        };
      }
    }
  } catch (e) {}

  try {
    const cached = localStorage.getItem('job_config_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      const data = parsed?.positions ? parsed : parsed?.data;
      if (data && Array.isArray(data.positions) && data.positions.length > 0) {
        return {
          positions: data.positions,
          requiredDocs: data.requiredDocs || [],
          applicantRequirements: data.applicantRequirements || [],
        };
      }
    }
  } catch (e) {}

  return null;
}
