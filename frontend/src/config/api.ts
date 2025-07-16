// API configuration for different environments
const getApiBaseUrl = (): string => {
  // Check if we have an environment variable set (for Docker builds)
  if (import.meta.env.VITE_API_BASE_URL) {
    // In Docker, the build-time env var might be set to backend:58000
    // But we need to use the browser's host for client-side requests
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl.includes('backend:')) {
      // Replace backend with current hostname for browser requests
      return `http://${window.location.hostname}:58000`;
    }
    return envUrl;
  }
  
  // Default: use current hostname with backend port
  // This works for both localhost and LAN access
  const currentHost = window.location.hostname;
  return `http://${currentHost}:58000`;
};

export const API_BASE = getApiBaseUrl();

// Export for debugging
console.log('API Base URL:', API_BASE);
console.log('Current hostname:', window.location.hostname);
console.log('Environment API URL:', import.meta.env.VITE_API_BASE_URL);