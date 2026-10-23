import { DOCUMENT } from '@angular/common';
import { Injectable, NgZone, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Tipado mínimo de la API Google Identity Services (GIS), última generación
 * del botón "Sign in with Google" (reemplaza a las APIs legacy auth2/gapi).
 * Referencia: https://developers.google.com/identity/gsi/web/reference/js-reference
 */
interface GoogleCredentialResponse {
  /** ID token (JWT) firmado por Google. */
  credential: string;
  /** Cómo inició sesión el usuario (`btn`, `fedcm`, `user_2tap`, ...). */
  select_by?: string;
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  /** Anti-replay (OIDC nonce): se replica como claim dentro del ID token. */
  nonce?: string;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  ux_mode?: 'popup' | 'redirect';
  itp_support?: boolean;
}

interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black' | 'outline_dark';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

interface GoogleAccountsId {
  initialize(config: GoogleIdConfig): void;
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
  prompt(): void;
  cancel(): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

/** Tiempo máximo para cargar el SDK de Google antes de desistir. */
const SCRIPT_LOAD_TIMEOUT_MS = 15_000;

/**
 * Integración con Google Identity Services (flujo de ID token, el estándar
 * actual de Google para "Sign in with Google" en SPAs):
 *  - Carga el script oficial una única vez bajo demanda.
 *  - Renderiza el BOTÓN OFICIAL de Google (obligatorio por las brand guidelines,
 *    no se dibuja un botón propio con el logo).
 *  - Genera un `nonce` por página (crypto.getRandomValues) que Google replica
 *    en el ID token y el backend compara exactamente → anti-replay/CSRF.
 */
@Injectable({ providedIn: 'root' })
export class GoogleSignInService {
  private static readonly GIS_SRC = 'https://accounts.google.com/gsi/client';

  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);

  private scriptLoad: Promise<void> | null = null;
  private nonce = '';

  /** true si hay Client ID configurado (el backend necesita el mismo valor). */
  get isConfigured(): boolean {
    return (
      typeof environment.googleClientId === 'string' &&
      environment.googleClientId.trim().length > 0
    );
  }

  /**
   * Carga GIS y renderiza el botón oficial dentro de `target`.
   * `onCredential` recibe el ID token y el nonce a enviar juntos al backend.
   * Resuelve cuando el botón quedó renderizado; rechaza si algo falla.
   */
  async render(
    target: HTMLElement,
    onCredential: (credential: string, nonce: string) => void,
  ): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('googleClientId no configurado en environments');
    }

    await this.loadScript();
    const google = this.document.defaultView?.window?.google;
    if (!google) {
      throw new Error('La librería de identidad de Google no está disponible');
    }

    // Nonce de 32 bytes: challenge por carga de página, vinculado al ID token.
    this.generateNonce();
    const nonce = this.nonce;

    // `initialize` debe llamarse una sola vez por página. Si el componente se
    // volvió a crear (ej. navegación login → registro → login), la última
    // configuración es la que GIS recuerda, por eso se registra de nuevo acá.
    google.accounts.id.initialize({
      client_id: environment.googleClientId.trim(),
      callback: (response) =>
        // Los callbacks de GIS llegan fuera de la zona de Angular.
        this.zone.run(() => onCredential(response.credential, nonce)),
      nonce,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      ux_mode: 'popup',
      itp_support: true,
    });

    // Evita duplicar el iframe si el contenedor ya tenía un botón previo.
    target.replaceChildren();

    // Lineamientos de marca: botón estándar, tema outline (sirve en claro y
    // oscuro), logo a la izquierda y locale según el idioma del documento.
    const width = Math.min(Math.max(Math.round(target.clientWidth), 200), 400);
    google.accounts.id.renderButton(target, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      logo_alignment: 'left',
      width,
      locale: this.resolveLocale(),
    });

    // El flujo de esta app es explícito (botón), no One Tap: que Google no
    // recuerde sesiones previas para autologuear.
    google.accounts.id.disableAutoSelect();
  }

  /**
   * Debe llamarse al cerrar sesión para que Google no reutilice el estado de
   * auto-selección de la cuenta (recomendación oficial de GIS).
   */
  disableAutoSelect(): void {
    this.document.defaultView?.window?.google?.accounts.id.disableAutoSelect();
  }

  private loadScript(): Promise<void> {
    if (this.scriptLoad) return this.scriptLoad;

    this.scriptLoad = new Promise<void>((resolve, reject) => {
      if (this.document.defaultView?.window?.google) {
        resolve();
        return;
      }

      const script = this.document.createElement('script');
      script.src = GoogleSignInService.GIS_SRC;
      script.async = true;
      script.defer = true;

      const cleanup = () => {
        clearTimeout(timeoutId);
        script.onload = null;
        script.onerror = null;
      };

      const timeoutId = setTimeout(() => {
        cleanup();
        this.scriptLoad = null;
        script.remove();
        reject(new Error('Tiempo de espera agotado cargando el SDK de Google'));
      }, SCRIPT_LOAD_TIMEOUT_MS);

      script.onload = () => {
        cleanup();
        resolve();
      };
      script.onerror = () => {
        cleanup();
        this.scriptLoad = null;
        script.remove();
        reject(new Error('No se pudo cargar el SDK de identidad de Google'));
      };

      this.document.head.appendChild(script);
    });

    return this.scriptLoad;
  }

  private resolveLocale(): string {
    const lang = this.document.documentElement.lang?.trim();
    // GIS espera etiquetas BCP-47 (`es`, `es-419`, `pt-BR`). Si el documento no
    // declara un idioma válido, usamos español.
    return lang && /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(lang)
      ? lang
      : 'es';
  }

  private generateNonce(): void {
    const cryptoApi = this.document.defaultView?.crypto ?? globalThis.crypto;
    if (!cryptoApi?.getRandomValues) {
      throw new Error('El navegador no soporta crypto.getRandomValues');
    }

    const bytes = new Uint8Array(32);
    cryptoApi.getRandomValues(bytes);
    this.nonce = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
