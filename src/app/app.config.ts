import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { ThemeService } from './layout/service/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // Orden importa: primero se adjunta el token, después se maneja el 401/refresh.
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideOptimus({
      theme: {
        preset: Aura,
        options: {
          cssLayer: {
            name: 'optimus',
            order: 'theme, base, optimus',
          },
          darkModeSelector: '.app-dark',
        },
      },
    }),
    // Después de que Optimus inicialice su tema, aplicamos el tema global
    // guardado en la BD antes de mostrar la aplicación.
    provideAppInitializer(() => inject(ThemeService).load()),
  ],
};
