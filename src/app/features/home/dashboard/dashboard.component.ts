import { ChangeDetectionStrategy, Component } from "@angular/core";
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
  templateUrl: "./dashboard.component.html",
  styleUrl: "./dashboard.component.scss",
})
export class DashboardComponent {}
