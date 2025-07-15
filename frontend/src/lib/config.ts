// Runtime configuration for Docker environment
export const getApiBaseUrl = () => {
  // When running in Docker with nginx proxy, use relative URLs
  // This will make requests go through the nginx proxy to backend:8000
  return '';
};
