import { Location } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProgressSpinnerModule } from '@openng/optimus-ui/progressspinner';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Errores que el backend envía como código estable en `?error=` (nunca el
 * mensaje crudo, para no filtrar detalles internos en la URL).
 */
const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  google_auth_failed:
    'No se pudo completar el inicio de sesión con Google. Intentá de nuevo.',
  google_account_error:
    'Tu cuenta de Google no está habilitada para iniciar sesión en esta aplicación.',
  google_login_failed:
    'Ocurrió un error al iniciar sesión con Google. Intentá de nuevo.',
};

/**
 * Punto de llegada del flujo OAuth 2.0 con redirect
 * (`GET /api/auth/google` → Google → `/api/auth/google/callback`).
 *
 * El backend redirige con `?accessToken=...&refreshToken=...` o `?error=codigo`.
 * Este componente lee esos parámetros, **limpia la URL inmediatamente** (para
 * que los tokens no queden en el historial ni se compartan por accidente),
 * guarda la sesión, carga el perfil y navega a /perfil.
 *
 * El flujo recomendado es el botón de Google Identity Services (POST
 * /auth/google), que no pasa tokens por la URL; este callback existe para que
 * el flujo redirect siga siendo funcional.
 */
@Component({
  selector: 'app-google-callback',
  imports: [RouterLink, ProgressSpinnerModule],
  templateUrl: './google-callback.html',
})
export class GoogleCallback implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly authService = inject(AuthService);

  protected readonly processing = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.completeLogin();
  }

  private async completeLogin(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const errorCode = params.get('error');

    // Los tokens nunca deben quedar visibles en la barra de direcciones.
    this.location.replaceState('/auth/callback');

    if (errorCode) {
      this.fail(errorCode);
      return;
    }
    if (!accessToken || !refreshToken) {
      this.fail('missing_tokens');
      return;
    }

    try {
      await firstValueFrom(
        this.authService.completeGoogleRedirect({ accessToken, refreshToken }),
      );
      await this.router.navigate(['/perfil'], { replaceUrl: true });
    } catch {
      // No dejamos una sesión a medio crear si falló la carga del perfil.
      this.authService.logout();
      this.fail('google_login_failed');
    } finally {
      this.processing.set(false);
    }
  }

  private fail(code: string): void {
    this.processing.set(false);
    this.error.set(
      ERROR_MESSAGES[code] ??
        'No se pudo completar el inicio de sesión con Google. Intentá de nuevo.',
    );
  }
}
