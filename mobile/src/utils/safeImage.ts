/**
 * Safe Image URI helper — prevents RCTImageView crashes
 * Handles: string, object {uri:...}, object {url:...}, null, undefined
 */

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=BMS&background=1a1a1a&color=F97316&size=100';

export function safeImageUri(value: any): string {
  if (!value) return DEFAULT_AVATAR;
  if (typeof value === 'string') return value || DEFAULT_AVATAR;
  if (typeof value === 'object') {
    if (value.uri && typeof value.uri === 'string') return value.uri;
    if (value.url && typeof value.url === 'string') return value.url;
    if (value.secure_url && typeof value.secure_url === 'string') return value.secure_url;
  }
  return DEFAULT_AVATAR;
}

export function safePortfolioUri(item: any): string {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'object') {
    return item.url || item.uri || item.secure_url || '';
  }
  return '';
}
