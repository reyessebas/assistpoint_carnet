const isLocalFrontend = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE_URL = isLocalFrontend ? 'http://localhost:3000/api' : '/api';
// Base URL for frontend assets (images, static files).
// Empty string keeps assets on the same origin (http://localhost:4200 in dev).
export const ASSET_BASE_URL = '';

// Backward-compatible alias for existing imports/usages.
export const STATIC_BASE_URL = ASSET_BASE_URL;

export function resolveAssetUrl(assetPath?: string): string {
  const fallback = `${ASSET_BASE_URL}/img/carnet.png`;

  if (!assetPath) {
    return fallback;
  }

  if (assetPath.startsWith('http://') || assetPath.startsWith('https://') || assetPath.startsWith('data:')) {
    return assetPath;
  }

  const normalizedPath = assetPath.replace(/^\.\//, '').replace(/^\//, '');
  return normalizedPath ? `${ASSET_BASE_URL}/${normalizedPath}` : fallback;
}
