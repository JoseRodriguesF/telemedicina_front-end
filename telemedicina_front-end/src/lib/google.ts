// Client-side helper to perform Google Sign-In using Google Identity Services.
// It returns the ID token (JWT) from Google which should be sent to the backend
// for verification/login.

export async function signInWithGoogle(): Promise<string> {
  if (typeof window === 'undefined') throw new Error('Google Sign-In only available in browser');

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || (window as any).__NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const currentOrigin = window.location.origin;

  console.log('[GoogleAuth] Iniciando login...');
  console.log('[GoogleAuth] Origin atual:', currentOrigin);

  if (!clientId) {
    console.error('[GoogleAuth] ERRO: NEXT_PUBLIC_GOOGLE_CLIENT_ID não está definida!');
    throw new Error('Google Client ID não configurado.');
  }

  return new Promise((resolve, reject) => {
    // initialize when script loaded
    function init() {
      const g = (window as any).google;
      if (!g || !g.accounts || !g.accounts.id) return reject(new Error('Serviços de Identidade do Google não estão disponíveis.'));
      
      try {
        // initialize with a callback that receives the credential
        g.accounts.id.initialize({
          client_id: clientId,
          callback: (resp: any) => {
            if (resp && resp.credential) {
              console.log('[GoogleAuth] Credencial recebida com sucesso.');
              resolve(resp.credential);
            } else {
              reject(new Error('Nenhuma credencial retornada pelo Google.'));
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true
        });

        // Para evitar erros de "prompt not displayed", vamos usar o renderButton 
        // em um elemento oculto e simular o clique, ou simplesmente tentar o prompt
        // mas com um tratamento mais amigável.
        
        g.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason();
            console.warn('[GoogleAuth] Prompt não exibido:', reason);
            
            if (reason === 'origin_mismatch') {
              reject(new Error(`Erro de Configuração: A URL '${currentOrigin}' não está autorizada no Console do Google Cloud para o Client ID ${clientId}. Verifique as 'Origens JavaScript autorizadas'.`));
            } else if (reason === 'opt_out_or_no_session') {
              // Se não há sessão ou usuário optou por não ver, tentamos renderizar o botão clássico
              // ou instruir o usuário.
              reject(new Error('Sessão do Google não encontrada ou bloqueada. Tente fazer login manualmente no Google primeiro.'));
            } else {
              reject(new Error(`O seletor do Google não pôde ser exibido (${reason}).`));
            }
          }
        });

      } catch (e) {
        console.error('[GoogleAuth] Erro na inicialização:', e);
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
      setTimeout(() => init(), 500);
      return;
    }

    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.setAttribute('data-google-identity', '1');
    s.onload = init;
    s.onerror = () => reject(new Error('Falha ao carregar o script do Google.'));
    document.head.appendChild(s);
  });
}

export default signInWithGoogle;

