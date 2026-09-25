import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/auth.model';
import { AssignRolePayload, PolicyPayload } from '../models/authorization.model';

interface RoleResult extends AssignRolePayload {
  assigned?: boolean;
  revoked?: boolean;
}

interface PolicyResult extends PolicyPayload {
  added?: boolean;
  removed?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthorizationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/authorization`;

  assignRole(payload: AssignRolePayload): Observable<RoleResult> {
    return this.http
      .post<ApiEnvelope<RoleResult>>(`${this.baseUrl}/roles`, payload)
      .pipe(map((res) => res.data));
  }

  revokeRole(payload: AssignRolePayload): Observable<RoleResult> {
    return this.http
      .request<ApiEnvelope<RoleResult>>('DELETE', `${this.baseUrl}/roles`, { body: payload })
      .pipe(map((res) => res.data));
  }

  addPolicy(payload: PolicyPayload): Observable<PolicyResult> {
    return this.http
      .post<ApiEnvelope<PolicyResult>>(`${this.baseUrl}/policies`, payload)
      .pipe(map((res) => res.data));
  }

  removePolicy(payload: PolicyPayload): Observable<PolicyResult> {
    return this.http
      .request<ApiEnvelope<PolicyResult>>('DELETE', `${this.baseUrl}/policies`, { body: payload })
      .pipe(map((res) => res.data));
  }
}
