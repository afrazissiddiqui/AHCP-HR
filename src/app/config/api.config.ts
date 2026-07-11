const AHCP_PUBLIC_PATH = '/ahcp/public';
const EXTERNAL_API_BASE_URL = `http://alhafiz.vdc.services:8084${AHCP_PUBLIC_PATH}`;

function isLocalDevHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function isInternalHost(hostname: string): boolean {
  return hostname === 'ahcp.hr' || hostname.endsWith('.ahcp.hr');
}

function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return EXTERNAL_API_BASE_URL;
  }

  const { hostname, origin } = window.location;
  const host = hostname.toLowerCase();

  // Local dev: Angular proxy rewrites /ahcp-api → backend /ahcp/public
  if (isLocalDevHost(host)) {
    return '/ahcp-api';
  }

  // Internal LAN server
  if (isInternalHost(host)) {
    return `http://${host}:8084${AHCP_PUBLIC_PATH}`;
  }

  // App deployed on the same API host (e.g. alhafiz.vdc.services:8084/ahcp/public)
  if (host === 'alhafiz.vdc.services') {
    return `${origin}${AHCP_PUBLIC_PATH}`;
  }

  // Other deployments: IIS must rewrite /ahcp-api → backend /ahcp/public
  return '/ahcp-api';
}

/** Pioneer biometrics attendance API (proxied in local dev via proxy.conf.json). */
export const BIOMETRICS_API_BASE_URL = resolveBiometricsApiBaseUrl();

function resolveBiometricsApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://pioneerbiometrics.com:71/api';
  }

  return '/biometrics-api';
}

/** Backend server root — resolved from where the app is accessed. */
export function getApiBaseUrl(): string {
  return resolveApiBaseUrl();
}

/** @deprecated Use getApiBaseUrl() — kept for existing imports. */
export const API_BASE_URL = typeof window === 'undefined' ? EXTERNAL_API_BASE_URL : resolveApiBaseUrl();

/** Builds a full API URL: `{base}/api/{endpoint}` (base resolved on each call). */
export function apiUrl(endpoint: string): string {
  const path = endpoint.replace(/^\/+/, '');
  return `${resolveApiBaseUrl()}/api/${path}`;
}
