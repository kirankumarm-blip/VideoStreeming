import { getAssetUrl, getAssetBaseUrl } from './assetUrl';

describe('Asset URL Utility (getAssetUrl & getAssetBaseUrl)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('resolves relative path with leading slash using environment base URL', () => {
    process.env.VITE_ASSET_BASE_URL = 'https://cdn.example.com';
    process.env.REACT_APP_ASSET_BASE_URL = 'https://cdn.example.com';
    expect(getAssetUrl('/uploads/images/avatar.png')).toBe('https://cdn.example.com/uploads/images/avatar.png');
  });

  test('resolves relative path without leading slash without duplicate slashes', () => {
    process.env.VITE_ASSET_BASE_URL = 'https://cdn.example.com';
    process.env.REACT_APP_ASSET_BASE_URL = 'https://cdn.example.com';
    expect(getAssetUrl('uploads/videos/test.mp4')).toBe('https://cdn.example.com/uploads/videos/test.mp4');
  });

  test('preserves absolute HTTP and HTTPS URLs', () => {
    process.env.VITE_ASSET_BASE_URL = 'https://cdn.example.com';
    process.env.REACT_APP_ASSET_BASE_URL = 'https://cdn.example.com';
    expect(getAssetUrl('http://external.domain.com/photo.jpg')).toBe('http://external.domain.com/photo.jpg');
    expect(getAssetUrl('https://images.unsplash.com/photo-123')).toBe('https://images.unsplash.com/photo-123');
  });

  test('preserves blob: and data: URLs', () => {
    process.env.VITE_ASSET_BASE_URL = 'https://cdn.example.com';
    process.env.REACT_APP_ASSET_BASE_URL = 'https://cdn.example.com';
    expect(getAssetUrl('blob:http://localhost:3000/uuid-1234')).toBe('blob:http://localhost:3000/uuid-1234');
    expect(getAssetUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==')).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==');
  });

  test('handles null, undefined, empty, and whitespace strings with fallback', () => {
    expect(getAssetUrl(null, '/default.png')).toBe('/default.png');
    expect(getAssetUrl(undefined, '/default.png')).toBe('/default.png');
    expect(getAssetUrl('', '/default.png')).toBe('/default.png');
    expect(getAssetUrl('   ', '/default.png')).toBe('/default.png');
    expect(getAssetUrl(null)).toBe('');
  });

  test('preserves query parameters and fragments', () => {
    process.env.VITE_ASSET_BASE_URL = 'https://cdn.example.com';
    process.env.REACT_APP_ASSET_BASE_URL = 'https://cdn.example.com';
    expect(getAssetUrl('/media/stream.m3u8?token=xyz123&expires=99999')).toBe(
      'https://cdn.example.com/media/stream.m3u8?token=xyz123&expires=99999'
    );
  });

  test('avoids duplicate slashes when base URL has trailing slash', () => {
    process.env.VITE_ASSET_BASE_URL = 'https://cdn.example.com///';
    process.env.REACT_APP_ASSET_BASE_URL = 'https://cdn.example.com///';
    expect(getAssetUrl('/uploads/test.jpg')).toBe('https://cdn.example.com/uploads/test.jpg');
  });

  test('rejects dangerous and unsupported URI schemes', () => {
    expect(getAssetUrl('javascript:alert(1)', '/fallback.png')).toBe('/fallback.png');
    expect(getAssetUrl('ftp://ftp.example.com/file.mp4', '/fallback.png')).toBe('/fallback.png');
    expect(getAssetUrl('file:///C:/passwords.txt', '/fallback.png')).toBe('/fallback.png');
  });

  test('returns clean relative path when base URL is empty or unconfigured', () => {
    delete process.env.VITE_ASSET_BASE_URL;
    delete process.env.REACT_APP_ASSET_BASE_URL;
    expect(getAssetUrl('/uploads/image.png')).toBe('/uploads/image.png');
    expect(getAssetUrl('uploads/image.png')).toBe('/uploads/image.png');
  });
});
