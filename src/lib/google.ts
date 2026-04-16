// Client-side helper to perform Google Sign-In using Google Identity Services.
// It returns the ID token (JWT) from Google which should be sent to the backend
// for verification/login.

export async function signInWithGoogle(): Promise<string> {
  if (typeof window === 'undefined') throw new Error('Google Sign-In only available in browser');
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || (window as any).__NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Google Client ID not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID');

  return new Promise((resolve, reject) => {
    let promptActive = false;
    
    // initialize when script loaded
    function init() {
      const g = (window as any).google;
      if (!g || !g.accounts || !g.accounts.id) return reject(new Error('Serviços de Identidade do Google não estão disponíveis. Verifique sua conexão ou bloqueadores de anúncios.'));
      
      try {
        // initialize with a callback that receives the credential
        g.accounts.id.initialize({
          client_id: clientId,
          callback: (resp: any) => {
            if (resp && resp.credential) {
              resolve(resp.credential);
            } else {
              reject(new Error('Nenhuma credencial retornada pelo Google. Tente novamente.'));
            }
          },
          auto_select: false,
          itp_support: true
        });

        // show one-tap / prompt UI
        g.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            console.warn('[GoogleAuth] Prompt not displayed:', notification.getNotDisplayedReason());
            // Se o prompt não for exibido (ex: bloqueado ou sessão já ativa), 
            // podemos tentar renderizar um botão invisível ou lançar erro explicativo.
            if (notification.getNotDisplayedReason() === 'skipped_by_user') {
               reject(new Error('Login cancelado pelo usuário.'));
            } else {
               reject(new Error(`O seletor de conta do Google não pôde ser exibido (${notification.getNotDisplayedReason()}). Tente recarregar a página.`));
            }
          } else if (notification.isSkippedMoment()) {
            console.warn('[GoogleAuth] Prompt skipped:', notification.getSkippedReason());
            reject(new Error('O login do Google foi ignorado.'));
          } else if (notification.isDismissedMoment()) {
            console.warn('[GoogleAuth] Prompt dismissed:', notification.getDismissedReason());
            // Não rejeita imediatamente se foi apenas fechado, mas marca como inativo
          }
        });
        
        promptActive = true;
        
        // Timeout de segurança se nada acontecer em 60s
        setTimeout(() => {
          if (promptActive) {
            // Check if still pending
          }
        }, 60000);

      } catch (e) {
        console.error('[GoogleAuth] Initialization error:', e);
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
    s.onerror = () => reject(new Error('Falha ao carregar o script de autenticação do Google. Verifique sua conexão.'));
    document.head.appendChild(s);
  });
}

export default signInWithGoogle;
