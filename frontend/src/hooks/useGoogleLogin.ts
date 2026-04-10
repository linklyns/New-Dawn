import { useEffect, useCallback, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
              shape?: string;
              logo_alignment?: string;
            },
          ) => void;
        };
      };
    };
    __gsi_initialized?: boolean;
  }
}

interface UseGoogleLoginOptions {
  onCredential: (credential: string) => void;
  buttonElementId: string;
  buttonText?: 'signin_with' | 'signup_with' | 'continue_with';
}

export function useGoogleLogin({ onCredential, buttonElementId, buttonText = 'signin_with' }: UseGoogleLoginOptions) {
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  const initGoogle = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google) return;

    // Only initialize once globally to avoid GSI_LOGGER warnings
    if (!window.__gsi_initialized) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => callbackRef.current(response.credential),
      });
      window.__gsi_initialized = true;
    }

    const el = document.getElementById(buttonElementId);
    if (el && !el.hasChildNodes()) {
      const measuredWidth = Math.min(el.clientWidth || el.parentElement?.clientWidth || 280, 320);
      window.google.accounts.id.renderButton(el, {
        theme: 'outline',
        size: 'medium',
        width: measuredWidth,
        text: buttonText,
        shape: 'rectangular',
        logo_alignment: 'left',
      });
    }
  }, [buttonElementId, buttonText]);

  useEffect(() => {
    if (window.google) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          initGoogle();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [initGoogle]);
}
