// Extend window interface for PasswordCredential API
declare global {
  interface Window {
    PasswordCredential: new (data: { id: string; password: string; name?: string }) => Credential;
  }
}

/**
 * Store credentials to browser password manager
 * Works on Chrome, Edge, and other Chromium browsers
 * Falls back gracefully on unsupported browsers (Safari, Firefox)
 */
export async function storeCredential(email: string, password: string): Promise<boolean> {
  // Check if PasswordCredential API is available
  if (!('PasswordCredential' in window)) {
    console.log('[Credential] PasswordCredential API not supported');
    return false;
  }

  try {
    const credential = new window.PasswordCredential({
      id: email,
      password: password,
      name: email,
    });
    
    await navigator.credentials.store(credential);
    console.log('[Credential] Credentials stored successfully');
    return true;
  } catch (error) {
    console.warn('[Credential] Failed to store credentials:', error);
    return false;
  }
}

/**
 * Request stored credentials from browser
 * Returns null if no credentials found or user cancels
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
