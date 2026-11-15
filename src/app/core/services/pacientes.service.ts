import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { CrudHttpService } from "./crud-http.service";
import {
  Paciente,
  RegistrarPacienteConPersonaPayload,
  RegistrarPacienteConPersonaResult,
} from "../models/laboratorio.model";
import { ApiEnvelope } from "../models/auth.model";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class PacientesService extends CrudHttpService<Paciente> {
  protected readonly endpoint = "pacientes";

  /**
   * Alta completa de paciente: crea la persona con todos sus datos y el
   * paciente con código aleatorio (HC-XXXXXX) en una sola transacción del
   * backend (POST /pacientes/registrar-con-persona).
   */
  registrarConPersona(
    payload: RegistrarPacienteConPersonaPayload,
  ): Observable<RegistrarPacienteConPersonaResult> {
    return this.http
      .post<ApiEnvelope<RegistrarPacienteConPersonaResult>>(
        `${environment.apiUrl}/${this.endpoint}/registrar-con-persona`,
        payload,
      )
      .pipe(map((res) => res.data));
  }
}
