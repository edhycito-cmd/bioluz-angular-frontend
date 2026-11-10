import { Injectable } from "@angular/core";
import { CrudHttpService } from "./crud-http.service";
import { Paciente } from "../models/laboratorio.model";

@Injectable({ providedIn: "root" })
export class PacientesService extends CrudHttpService<Paciente> {
  protected readonly endpoint = "pacientes";
}
