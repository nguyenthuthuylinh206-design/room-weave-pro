// Extend window interface for PasswordCredential API
declare global {
  interface Window {
    PasswordCredential: new (data: { id: string; password: string; name?: string }) => Credential;
  }
}

const STORAGE_KEY = 'app_saved_credential_v1';
const LOGGED_OUT_FLAG = 'app_user_logged_out_v1';

/**
 * Simple XOR-based obfuscation. NOT cryptographically secure — just prevents
 * casual reading of localStorage. For true security, use the browser's native
 * password manager (which we also try via PasswordCredential API).
 */
const OBFUSCATION_KEY = 'rwp-2026-keychain-fallback-key';

function obfuscate(text: string): string {
  const result: number[] = [];
  for (let i = 0; i < text.length; i++) {
    result.push(text.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length));
  }
  // Convert to base64 for safe storage
  return btoa(String.fromCharCode(...result));
}

function deobfuscate(encoded: string): string {
  try {
    const decoded = atob(encoded);
    const result: string[] = [];
    for (let i = 0; i < decoded.length; i++) {
      result.push(String.fromCharCode(decoded.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length)));
    }
    return result.join('');
  } catch {
    return '';
  }
}

/**
 * Store credentials to:
 * 1. Browser PasswordCredential API (Chrome/Edge desktop)
 * 2. Local encrypted storage (mobile/PWA fallback — works on all platforms)
 */
export async function storeCredential(email: string, password: string): Promise<boolean> {
  // Always save to local storage (works on every platform including iOS PWA)
  try {
    const payload = JSON.stringify({ email, password, savedAt: Date.now() });
    localStorage.setItem(STORAGE_KEY, obfuscate(payload));
    console.log('[Credential] Saved to local storage');
  } catch (error) {
    console.warn('[Credential] Failed to save to local storage:', error);
  }

  // Also try native PasswordCredential API (Chrome/Edge desktop)
  if ('PasswordCredential' in window) {
    try {
      const credential = new window.PasswordCredential({
        id: email,
        password: password,
        name: email,
      });
      await navigator.credentials.store(credential);
      console.log('[Credential] Stored to native password manager');
    } catch (error) {
      console.warn('[Credential] Native store failed (non-fatal):', error);
    }
  }

  return true;
}

/**
 * Get locally stored credential (works on all platforms — mobile included).
 */
export function getLocalCredential(): { email: string; password: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const decoded = deobfuscate(raw);
    if (!decoded) return null;
    const parsed = JSON.parse(decoded);
    if (parsed.email && parsed.password) {
      return { email: parsed.email, password: parsed.password };
    }
  } catch (error) {
    console.warn('[Credential] Failed to read local credential:', error);
  }
  return null;
}

/**
 * Clear locally stored credential.
 */
export function clearLocalCredential(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Request stored credentials from browser native API (Chrome/Edge only).
 * Returns null if no credentials found or user cancels.
 */
export async function getStoredCredential(): Promise<{ email: string; password: string } | null> {
  if (!('credentials' in navigator)) {
    return null;
  }

  try {
    const credential = await navigator.credentials.get({
      password: true,
      mediation: 'optional',
    } as CredentialRequestOptions);

    if (credential && credential.type === 'password') {
      const pwdCred = credential as Credential & { id: string; password?: string };
      return {
        email: pwdCred.id,
        password: pwdCred.password || '',
      };
    }
  } catch (error) {
    console.warn('[Credential] Failed to get credentials:', error);
  }

  return null;
}
