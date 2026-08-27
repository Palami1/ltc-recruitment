export const getApiUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Relative URL '' works seamlessly across both Vite dev server (proxied to Express port 5000)
  // and Vercel Production deployment (/api Serverless Functions).
  // This guarantees PC and Mobile devices (via IP address or Vercel domain) hit the EXACT same API.
  return '';
};

export const API = getApiUrl();
