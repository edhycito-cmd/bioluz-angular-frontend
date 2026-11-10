import { Injectable } from "@angular/core";
import { CrudHttpService } from "./crud-http.service";
import { OrdenLaboratorio } from "../models/laboratorio.model";

@Injectable({ providedIn: "root" })
export class OrdenesLaboratorioService extends CrudHttpService<OrdenLaboratorio> {
  protected readonly endpoint = "ordenes-laboratorio";
}
