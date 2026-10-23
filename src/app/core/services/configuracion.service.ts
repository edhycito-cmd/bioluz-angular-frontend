import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/auth.model';
import { ConfiguracionItem, TemaConfig } from '../models/configuracion.model';

/**
 * Configuraciones globales (tabla paramétrica `app_configuraciones`).
 *
 * La lectura del tema es pública para poder aplicarlo desde el arranque de la
 * SPA; la escritura queda protegida por Casbin en el backend.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/configuraciones`;

  obtenerTema(): Observable<TemaConfig | null> {
    return this.http
      .get<ApiEnvelope<ConfiguracionItem<TemaConfig> | null>>(`${this.baseUrl}/tema`)
      .pipe(map((res) => res.data?.valor ?? null));
  }

  guardarTema(tema: TemaConfig): Observable<TemaConfig> {
    return this.http
      .put<ApiEnvelope<ConfiguracionItem<TemaConfig>>>(`${this.baseUrl}/tema`, {
        valor: tema,
      })
      .pipe(map((res) => res.data.valor));
  }
}
