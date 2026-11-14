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
  pattern,
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
import { DialogModule } from "@openng/optimus-ui/dialog";
import { AppAuthShell } from "../../../layout/component/app.auth-shell";
import { CheckboxModule } from "@openng/optimus-ui/checkbox";
import { RippleModule } from "@openng/optimus-ui/ripple";
import { ProgressSpinnerModule } from "@openng/optimus-ui/progressspinner";

interface LoginModel {
  email: string;
  password: string;
  rememberMe: boolean;
}

/** Paso actual del flujo de desbloqueo de cuenta. */
type PasoDesbloqueo = "solicitar" | "codigo";

interface DesbloqueoModel {
  email: string;
  unlockCode: string;
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
    DialogModule,
    RippleModule,
    ProgressSpinnerModule,
    AppAuthShell,
  ],
  providers: [MessageService],
  templateUrl: "./login.html",
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly googleSignIn = inject(GoogleSignInService);
  private readonly messageService = inject(MessageService);

  protected readonly model = signal<LoginModel>({
    email: "",
    password: "",
    rememberMe: false,
  });

  protected readonly loginForm = form(this.model, (path) => {
    required(path.email, { message: "El correo electrónico es obligatorio" });
    email(path.email, { message: "Introduzca un correo electrónico válido" });
    required(path.password, { message: "La contraseña es obligatoria" });
  });

  protected readonly serverError = signal<string | null>(null);
  protected readonly mostrarPassword = signal(false);

  /** Estado del flujo de desbloqueo de cuenta bloqueada. */
  protected readonly desbloqueoVisible = signal(false);
  protected readonly pasoDesbloqueo = signal<PasoDesbloqueo>("solicitar");
  protected readonly desbloqueoModel = signal<DesbloqueoModel>({
    email: "",
    unlockCode: "",
  });
  protected readonly desbloqueoEnCurso = signal(false);
  protected readonly desbloqueoError = signal<string | null>(null);
  protected readonly desbloqueoMessage = signal<string | null>(null);

  protected readonly desbloqueoForm = form(this.desbloqueoModel, (path) => {
    required(path.email, {
      message: "El correo electrónico es obligatorio",
    });
    email(path.email, {
      message: "Introduzca un correo electrónico válido",
    });
    required(path.unlockCode, {
      message: "El código de desbloqueo es obligatorio",
    });
    pattern(path.unlockCode, /^\d{6}$/, {
      message: "El código debe tener 6 dígitos",
    });
  });

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
        this.authService.loginWithGoogle({
          credential,
          nonce,
          rememberMe: this.model().rememberMe,
        }),
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

  // ------------------------------------------------------------------
  // Desbloqueo de cuenta (POST /auth/request-unlock + POST /auth/unlock)
  // ------------------------------------------------------------------

  /** Abre el diálogo de desbloqueo con el email del formulario de login. */
  protected abrirDesbloqueo(): void {
    this.desbloqueoError.set(null);
    this.desbloqueoMessage.set(null);
    this.pasoDesbloqueo.set("solicitar");
    this.desbloqueoModel.set({
      email: this.model().email,
      unlockCode: "",
    });
    this.desbloqueoVisible.set(true);
  }

  protected cerrarDesbloqueo(): void {
    this.desbloqueoVisible.set(false);
    this.desbloqueoError.set(null);
    this.desbloqueoMessage.set(null);
    this.desbloqueoModel.set({ email: "", unlockCode: "" });
  }

  /** Paso 1: solicita el código de desbloqueo. */
  protected solicitarCodigo(event: Event): void {
    event.preventDefault();
    this.desbloqueoError.set(null);
    this.desbloqueoMessage.set(null);

    submit(this.desbloqueoForm, async () => {
      this.desbloqueoEnCurso.set(true);
      try {
        const respuesta = await firstValueFrom(
          this.authService.requestUnlockCode(this.desbloqueoModel().email),
        );
        this.pasoDesbloqueo.set("codigo");
        this.desbloqueoMessage.set(respuesta.message);
        // En desarrollo el backend devuelve el código en la respuesta para
        // agilizar las pruebas; se precarga el campo si viene.
        if (respuesta.unlockCode) {
          const codigo = respuesta.unlockCode;
          this.desbloqueoModel.update((m) => ({ ...m, unlockCode: codigo }));
        }
      } catch (error) {
        this.desbloqueoError.set(this.extractErrorMessage(error));
      } finally {
        this.desbloqueoEnCurso.set(false);
      }
      return undefined;
    });
  }

  /** Paso 2: valida el código y desbloquea la cuenta. */
  protected confirmarDesbloqueo(event: Event): void {
    event.preventDefault();
    this.desbloqueoError.set(null);

    submit(this.desbloqueoForm, async () => {
      const { email: correo, unlockCode } = this.desbloqueoModel();
      this.desbloqueoEnCurso.set(true);
      try {
        const respuesta = await firstValueFrom(
          this.authService.unlockAccount(correo, unlockCode),
        );
        this.desbloqueoVisible.set(false);
        this.model.update((m) => ({ ...m, email: correo }));
        this.messageService.add({
          severity: "success",
          summary: "Cuenta desbloqueada",
          detail: `${respuesta.message} Ya puede iniciar sesión.`,
          life: 5000,
        });
      } catch (error) {
        this.desbloqueoError.set(this.extractErrorMessage(error));
      } finally {
        this.desbloqueoEnCurso.set(false);
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
    return "Se produjo un error inesperado. Intente nuevamente.";
  }
}
