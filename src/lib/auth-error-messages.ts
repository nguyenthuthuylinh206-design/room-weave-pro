/**
 * Maps Supabase auth error messages to i18n translation keys
 */

const AUTH_ERROR_MAP: Record<string, string> = {
  // Login errors
  'Invalid login credentials': 'errors.invalidCredentials',
  'invalid_credentials': 'errors.invalidCredentials',
  
  // Email confirmation
  'Email not confirmed': 'errors.emailNotConfirmed',
  
  // User not found
  'User not found': 'errors.emailNotFound',
  
  // Registration errors
  'User already registered': 'errors.emailExists',
  
  // Password errors
  'Password should be at least': 'errors.weakPassword',
  'password': 'errors.weakPassword',
  
  // Network errors
  'Failed to fetch': 'errors.networkError',
  'NetworkError': 'errors.networkError',
  'fetch failed': 'errors.networkError',
  
  // Rate limiting
  'For security purposes': 'errors.tooManyAttempts',
  'rate limit': 'errors.tooManyAttempts',
};

/**
 * Get the i18n translation key for a Supabase auth error message
 * @param errorMessage - The error message from Supabase
 * @returns The translation key to use with t()
 */
export function getAuthErrorKey(errorMessage: string): string {
  if (!errorMessage) return 'errors.unknown';
  
  // Check exact match first
  if (AUTH_ERROR_MAP[errorMessage]) {
    return AUTH_ERROR_MAP[errorMessage];
  }
  
  // Check partial match (case-insensitive)
  const lowerMessage = errorMessage.toLowerCase();
  for (const [key, value] of Object.entries(AUTH_ERROR_MAP)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Default fallback
  return 'errors.unknown';
}
