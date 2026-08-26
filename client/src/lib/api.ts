export const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    // If loaded on production (e.g. *.vercel.app or non-localhost domain)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const envUrl = import.meta.env.VITE_API_URL || '';
      // If VITE_API_URL points to localhost OR to suspended Render server, use relative path for Vercel Serverless API
      if (!envUrl || envUrl.includes('localhost') || envUrl.includes('onrender.com')) {
        return ''; // Relative path leverages Vercel /api rewrites natively
      }
      return envUrl;
    }
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};

export const API = getApiUrl();
