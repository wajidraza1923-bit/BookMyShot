/**
 * Safely extract a string URI from a portfolio item or avatar field.
 * Portfolio items can be either:
 *   - A string URL: "https://..."
 *   - An object: { url: "...", publicId: "...", size: ... }
 * 
 * This utility ensures a valid string is always returned.
 */
export function getImageUri(item: any, fallback: string = ''): string {
  if (!item) return fallback;
  if (typeof item === 'string') return item || fallback;
  if (typeof item === 'object') {
    return item.secure_url || item.url || item.uri || fallback;
  }
  return fallback;
}

/**
 * Get the first portfolio image as a string URI
 */
export function getPortfolioImage(portfolio: any[], fallback: string = ''): string {
  if (!portfolio || !Array.isArray(portfolio) || portfolio.length === 0) return fallback;
  return getImageUri(portfolio[0], fallback);
}

/**
 * Get avatar URI safely (handles string or object)
 */
export function getAvatarUri(avatar: any, fallback: string = 'https://via.placeholder.com/50'): string {
  return getImageUri(avatar, fallback);
}
