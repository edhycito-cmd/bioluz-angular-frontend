import { Injectable } from "@angular/core";
import { CrudHttpService } from "./crud-http.service";
import { Medico } from "../models/laboratorio.model";

@Injectable({ providedIn: "root" })
export class MedicosService extends CrudHttpService<Medico> {
  protected readonly endpoint = "medicos";
}
