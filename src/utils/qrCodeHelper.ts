import QRCode from 'qrcode';

// Cache generated QR codes for snappy UI performance
const qrCache = new Map<string, string>();

export async function generateQrCodeDataUrl(
  text: string,
  options?: {
    darkColor?: string;
    lightColor?: string;
    margin?: number;
    width?: number;
  }
): Promise<string> {
  const dark = options?.darkColor || '#000000';
  const light = options?.lightColor || '#ffffff00'; // transparent default
  const width = options?.width || 256;
  const margin = options?.margin ?? 1;

  const cacheKey = `${text}_${dark}_${light}_${width}_${margin}`;
  if (qrCache.has(cacheKey)) {
    return qrCache.get(cacheKey)!;
  }

  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width,
      margin,
      color: {
        dark,
        light: light.startsWith('#') && light.length === 9 ? '#ffffff' : light,
      },
      errorCorrectionLevel: 'M',
    });
    qrCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}

export function getVerificationUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://unincompany.app');
  return `${base.replace(/\/$/, '')}/verify/${token}`;
}

export function generateCryptoHash(employeeId: string, token: string): string {
  // Deterministic fake SHA-256 fingerprint for security display
  let hash = 0;
  const str = `${employeeId}-${token}-UNINCOMPANY-SECURE-KEY-2026`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
  return `SEC-ID-7810-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${token.slice(0, 6).toUpperCase()}`;
}

export function generateSecureToken(): string {
  const chars = '0123456789abcdef';
  const segments = [8, 4, 4, 4, 12];
  return segments
    .map((len) => {
      let str = '';
      for (let i = 0; i < len; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
      }
      return str;
    })
    .join('-');
}
