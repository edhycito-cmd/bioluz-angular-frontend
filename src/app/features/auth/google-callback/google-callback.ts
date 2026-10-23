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
 * El backend deja el refresh token en una cookie HttpOnly y redirige sin
 * tokens en la URL (`?error=codigo` solo si falló). Este componente canjea la
 * cookie por un access token en memoria, carga el perfil y navega a /perfil.
 *
 * El flujo recomendado es el botón de Google Identity Services (POST
 * /auth/google); este callback mantiene operativo el flujo redirect.
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
    const errorCode = params.get('error');

    // Limpia cualquier parámetro (incluido un posible código de error) de la URL.
    this.location.replaceState('/auth/callback');

    if (errorCode) {
      this.fail(errorCode);
      return;
    }

    try {
      await firstValueFrom(this.authService.completeGoogleRedirect());
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
