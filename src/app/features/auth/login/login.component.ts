// import { Component, inject } from '@angular/core';
// import { FormsModule } from '@angular/forms';
// import { MessageService } from '@openng/optimus-ui/api';
// import { Button, ButtonModule } from '@openng/optimus-ui/button';
// import { InputTextModule } from '@openng/optimus-ui/inputtext';
// import { MessageModule } from '@openng/optimus-ui/message';
// import { ToastModule } from '@openng/optimus-ui/toast';

// @Component({
//   imports: [MessageModule, ToastModule, ButtonModule, InputTextModule, FormsModule],
//   selector: 'app-login',
//   styleUrl: './login.component.scss',
//   templateUrl: './login.component.html',
//   providers: [MessageService],
// })
// export class LoginComponent {
//   messageService = inject(MessageService);
//   user: any = { username: '' };

//   onSubmit(form: any) {
//     if (form.valid) {
//       this.messageService.add({
//         severity: 'success',
//         summary: 'Success',
//         detail: 'Form Submitted',
//         life: 3000,
//       });
//       form.resetForm();
//     }
//   }
// }

import { Component, inject, signal } from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";
import { Router, RouterLink } from "@angular/router";
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
import { FormsModule } from "@angular/forms";
import { Button, ButtonModule } from "@openng/optimus-ui/button";
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
    FormsModule,
    RippleModule,
    AppFloatingConfigurator,
  ],
  providers: [MessageService],
  templateUrl: "./login.component.html",
  //styleUrl: "./login.component.scss",
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
