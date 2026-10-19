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
  templateUrl: "./dashboard.html",
  styleUrl: "./dashboard.scss",
})
export class Dashboard {}
