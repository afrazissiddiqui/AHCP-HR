/** Backend server root — change here when the API host or port changes. */
export const API_BASE_URL = 'http://ahcp.hr:8080';

/** Builds a full API URL: `{API_BASE_URL}/api/{endpoint}` */
export function apiUrl(endpoint: string): string {
  const path = endpoint.replace(/^\/+/, '');
  return `${API_BASE_URL}/api/${path}`;
}