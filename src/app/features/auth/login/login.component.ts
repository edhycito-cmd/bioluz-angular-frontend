import { Component, inject, signal } from "@angular/core";
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
import { MessageService } from "@openng/optimus-ui/api";
import { ToastModule } from "@openng/optimus-ui/toast";
import { ButtonModule } from "@openng/optimus-ui/button";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { MessageModule } from "@openng/optimus-ui/message";
import { AppFloatingConfigurator } from "../../../layout/component/app.floatingconfigurator";
import { CheckboxModule } from "@openng/optimus-ui/checkbox";
import { RippleModule } from "@openng/optimus-ui/ripple";

interface LoginModel {
  email: string;
  password: string;
  rememberMe: boolean;
}

@Component({
  selector: "app-login",
  standalone: true,
  imports: [
    FormField,
    MessageModule,
    ToastModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    RippleModule,
    AppFloatingConfigurator,
  ],
  providers: [MessageService],
  templateUrl: "./login.component.html",
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

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

  onSubmit(event: Event): void {
    event.preventDefault();
    this.serverError.set(null);

    submit(this.loginForm, async () => {
      try {
        await firstValueFrom(this.authService.login(this.model()));
        await this.router.navigate(["/dashboard"]);
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
