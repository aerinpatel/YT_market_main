// lib/auth-client-naive.ts
// Temporary client-side token storage (XSS vulnerability)
export function saveToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('yt_auth_token', token);
  }
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('yt_auth_token');
  }
  return null;
}
