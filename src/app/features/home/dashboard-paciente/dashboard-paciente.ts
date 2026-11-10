import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { DatePipe } from "@angular/common";
import { ButtonModule } from "@openng/optimus-ui/button";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: "app-dashboard-paciente",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterLink, DatePipe, ButtonModule],
  templateUrl: "./dashboard-paciente.html",
  styleUrl: "./dashboard-paciente.scss",
})
export class DashboardPaciente {
  private readonly authService = inject(AuthService);

  protected readonly user = this.authService.currentUser;
  protected readonly persona = this.authService.persona;
}
