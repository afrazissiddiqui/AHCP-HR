/** Canonical AHCP API base — every `apiUrl()` call builds on this. */
export const API_BASE_URL = 'http://alhafiz.vdc.services:8084/ahcp/public';

/** @deprecated Use API_BASE_URL — kept for older imports. */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/** Pioneer biometrics attendance API (proxied in local dev via proxy.conf.json). */
export const BIOMETRICS_API_BASE_URL = resolveBiometricsApiBaseUrl();

function resolveBiometricsApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://pioneerbiometrics.com:71/api';
  }

  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
    return '/biometrics-api';
  }

  return 'http://pioneerbiometrics.com:71/api';
}

/** Builds a full API URL: `{base}/api/{endpoint}`. */
export function apiUrl(endpoint: string): string {
  const path = endpoint.replace(/^\/+/, '');
  return `${API_BASE_URL}/api/${path}`;
}
