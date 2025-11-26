// Client-side helper to perform Google Sign-In using Google Identity Services.
// It returns the ID token (JWT) from Google which should be sent to the backend
// for verification/login.

export async function signInWithGoogle(): Promise<string> {
  if (typeof window === 'undefined') throw new Error('Google Sign-In only available in browser');
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || (window as any).__NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Google Client ID not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID');

  return new Promise((resolve, reject) => {
    // initialize when script loaded
    function init() {
      const g = (window as any).google;
      if (!g || !g.accounts || !g.accounts.id) return reject(new Error('Google Identity Services not available'));
      try {
        // initialize with a callback that receives the credential
        g.accounts.id.initialize({
          client_id: clientId,
          callback: (resp: any) => {
            if (resp && resp.credential) resolve(resp.credential);
            else reject(new Error('No credential returned from Google'));
          },
        });
        // show one-tap / prompt UI
        g.accounts.id.prompt();
      } catch (e) {
        reject(e);
      }
    }

    // load script if necessary
    if ((window as any).google && (window as any).google.accounts && (window as any).google.accounts.id) {
      init();
      return;
    }

    const existing = document.querySelector('script[data-google-identity]');
    if (existing) {
      // wait a bit and try to init
      setTimeout(() => init(), 500);
      return;
    }

    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.setAttribute('data-google-identity', '1');
    s.onload = init;
    s.onerror = () => reject(new Error('Failed to load Google Identity script'));
    document.head.appendChild(s);
  });
}

export default signInWithGoogle;
