import {
  Component,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import {
  email,
  form,
  FormField,
  required,
  submit,
} from "@angular/forms/signals";
import { AuthService } from "../../../core/services/auth.service";
import { GoogleSignInService } from "../../../core/services/google-signin.service";
import { MessageService } from "@openng/optimus-ui/api";
import { ToastModule } from "@openng/optimus-ui/toast";
import { ButtonModule } from "@openng/optimus-ui/button";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { MessageModule } from "@openng/optimus-ui/message";
import { AppFloatingConfigurator } from "../../../layout/component/app.floatingconfigurator";
import { CheckboxModule } from "@openng/optimus-ui/checkbox";
import { RippleModule } from "@openng/optimus-ui/ripple";
import { ProgressSpinnerModule } from "@openng/optimus-ui/progressspinner";

interface LoginModel {
  email: string;
  password: string;
  rememberMe: boolean;
}

@Component({
  selector: "app-login",
  imports: [
    FormField,
    MessageModule,
    ToastModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    RippleModule,
    ProgressSpinnerModule,
    AppFloatingConfigurator,
  ],
  providers: [MessageService],
  templateUrl: "./login.html",
  styleUrl: "./login.scss",
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly googleSignIn = inject(GoogleSignInService);

  protected readonly model = signal<LoginModel>({
    email: "",
    password: "",
    rememberMe: false,
  });

  protected readonly loginForm = form(this.model, (path) => {
    required(path.email, { message: "El email es obligatorio" });
    email(path.email, { message: "Ingresá un email válido" });
    required(path.password, { message: "La contraseña es obligatoria" });
  });

  protected readonly serverError = signal<string | null>(null);
  protected readonly mostrarPassword = signal(false);

  protected alternarPassword(): void {
    this.mostrarPassword.update((visible) => !visible);
  }

  /** Login con Google disponible solo si hay Client ID configurado. */
  protected readonly googleEnabled = signal(this.googleSignIn.isConfigured);
  /** true cuando GIS ya renderizó el botón oficial. */
  protected readonly googleReady = signal(false);
  /** Login con Google en proceso (evita doble clic / doble credential). */
  protected readonly googleLoading = signal(false);

  private readonly googleButtonContainer = viewChild<ElementRef<HTMLDivElement>>(
    "googleButtonContainer",
  );

  constructor() {
    // Render del botón una vez que el DOM está listo (GIS necesita el contenedor medido).
    afterNextRender(() => {
      if (!this.googleEnabled()) return;
      void this.renderGoogleButton();
    });
  }

  private async renderGoogleButton(): Promise<void> {
    this.googleLoading.set(true);
    this.googleReady.set(false);
    try {
      const container = this.googleButtonContainer()?.nativeElement;
      if (!container) return;
      await this.googleSignIn.render(container, (credential, nonce) =>
        this.onGoogleCredential(credential, nonce),
      );
      this.googleReady.set(true);
    } catch (error) {
      // Sin Google (offline, script bloqueado, Client ID/origen inválido): el
      // login con email/password sigue disponible.
      console.warn('[Login] No se pudo inicializar Google Sign-In', error);
      this.googleEnabled.set(false);
    } finally {
      this.googleLoading.set(false);
    }
  }

  /** Callback del credential entregado por el botón oficial de Google. */
  protected onGoogleCredential(credential: string, nonce: string): void {
    if (this.googleLoading()) return;
    void this.loginWithGoogle(credential, nonce);
  }

  private async loginWithGoogle(credential: string, nonce: string): Promise<void> {
    this.serverError.set(null);
    this.googleLoading.set(true);
    try {
      await firstValueFrom(
        this.authService.loginWithGoogle({ credential, nonce }),
      );
      await this.router.navigate(["/perfil"], { replaceUrl: true });
    } catch (error) {
      this.serverError.set(this.extractErrorMessage(error));
    } finally {
      this.googleLoading.set(false);
    }
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.serverError.set(null);

    submit(this.loginForm, async () => {
      try {
        await firstValueFrom(this.authService.login(this.model()));
        await this.router.navigate(["/perfil"]);
      } catch (error) {
        this.serverError.set(this.extractErrorMessage(error));
      }
      return undefined;
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
    }
    return "Ocurrió un error inesperado. Intentá de nuevo.";
  }
}
