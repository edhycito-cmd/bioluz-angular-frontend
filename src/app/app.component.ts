import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  //imports: [RouterOutlet, RouterLink],
  imports: [RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  // private readonly router = inject(Router);
  // protected readonly authService = inject(AuthService);

  // logout(): void {
  //   this.authService.logout();
  //   this.router.navigate(['/login']);
  // }
}
