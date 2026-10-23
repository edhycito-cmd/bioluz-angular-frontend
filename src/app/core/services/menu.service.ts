import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/auth.model';
import { MenuArbolItem } from '../models/menu.model';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/menus`;

  /** Árbol de menús activos listo para renderizar en `AppMenu`. */
  obtenerArbol(): Observable<MenuArbolItem[]> {
    return this.http
      .get<ApiEnvelope<MenuArbolItem[]>>(`${this.baseUrl}/arbol`)
      .pipe(map((res) => res.data));
  }
}
