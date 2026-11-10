import { Injectable } from "@angular/core";
import { CrudHttpService } from "./crud-http.service";
import { Empresa } from "../models/empresa.model";

@Injectable({ providedIn: "root" })
export class EmpresasService extends CrudHttpService<Empresa> {
  protected readonly endpoint = "empresas";
}
