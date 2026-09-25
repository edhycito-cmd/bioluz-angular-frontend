import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { DatePipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { StatsWidget } from "./components/statswidget";
import { RecentSalesWidget } from "./components/recentsaleswidget";
import { BestSellingWidget } from "./components/bestsellingwidget";
import { RevenueStreamWidget } from "./components/revenuestreamwidget";
import { NotificationsWidget } from "./components/notificationswidget";

@Component({
  selector: "app-dashboard",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    StatsWidget,
    RecentSalesWidget,
    BestSellingWidget,
    RevenueStreamWidget,
    NotificationsWidget,
  ],

  //imports: [DatePipe, RouterLink],
  templateUrl: "./dashboard.component.html",
  styleUrl: "./dashboard.component.scss",
})
export class DashboardComponent {
  //protected readonly authService = inject(AuthService);
}
