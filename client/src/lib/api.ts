export const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL || '';
  if (typeof window !== 'undefined') {
    // If loaded over HTTPS or on a domain that is not localhost
    if (window.location.protocol === 'https:' || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')) {
      // Ignore http://localhost to prevent browser Mixed-Content blocking
      if (envUrl.startsWith('http://localhost') || envUrl.startsWith('http://127.0.0.1')) {
        return ''; // Use relative path for production API requests
      }
    }
  }
  return envUrl || 'http://localhost:5000';
};

export const API = getApiUrl();
