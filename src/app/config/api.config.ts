const INTERNAL_API_BASE_URL = 'http://ahcp.hr:8084';
const EXTERNAL_API_BASE_URL = 'http://alhafiz.vdc.services:8084/ahcp/public';

function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return EXTERNAL_API_BASE_URL;
  }

  const hostname = window.location.hostname.toLowerCase();
  const isInternalServer =
    hostname === 'ahcp.hr' || hostname.endsWith('.ahcp.hr');

  return isInternalServer ? INTERNAL_API_BASE_URL : EXTERNAL_API_BASE_URL;
}

/** Pioneer biometrics attendance API (proxied in local dev via proxy.conf.json). */
export const BIOMETRICS_API_BASE_URL = resolveBiometricsApiBaseUrl();

function resolveBiometricsApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://pioneerbiometrics.com:71/api';
  }

  const hostname = window.location.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '/biometrics-api';
  }

  return 'http://pioneerbiometrics.com:71/api';
}

/** Backend server root — resolved from where the app is accessed. */
export const API_BASE_URL = resolveApiBaseUrl();

/** Builds a full API URL: `{API_BASE_URL}/api/{endpoint}` */
export function apiUrl(endpoint: string): string {
  const path = endpoint.replace(/^\/+/, '');
  return `${API_BASE_URL}/api/${path}`;
}
