import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { DatePipe } from "@angular/common";
import { ButtonModule } from "@openng/optimus-ui/button";
import { AuthService } from "../../../core/services/auth.service";

import { AppFormSection } from "../../../layout/component/app.form-section";
import { MessageModule } from "@openng/optimus-ui/message";

@Component({
  selector: "app-dashboard-paciente",
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: "block" },
  imports: [AppFormSection, MessageModule, RouterLink, DatePipe, ButtonModule],
  templateUrl: "./dashboard-paciente.html",
})
export class DashboardPaciente {
  private readonly authService = inject(AuthService);

  protected readonly user = this.authService.currentUser;
  protected readonly persona = this.authService.persona;
}
