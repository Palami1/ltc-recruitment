export const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    // In production (non-localhost), use relative path to route requests to Vercel Serverless Function (/api/...)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return '';
    }
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};

export const API = getApiUrl();
