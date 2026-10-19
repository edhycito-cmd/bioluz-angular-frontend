import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterModule],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  // private readonly router = inject(Router);
  // protected readonly authService = inject(AuthService);
  // logout(): void {
  //   this.authService.logout();
  //   this.router.navigate(['/login']);
  // }
}
