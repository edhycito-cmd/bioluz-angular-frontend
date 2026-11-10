import { Injectable } from "@angular/core";
import { CrudHttpService } from "./crud-http.service";
import { Resultado } from "../models/laboratorio.model";

@Injectable({ providedIn: "root" })
export class ResultadosService extends CrudHttpService<Resultado> {
  protected readonly endpoint = "resultados";
}
