import { Injectable } from "@angular/core";
import { CrudHttpService } from "./crud-http.service";
import { ValorReferencia } from "../models/catalogos-analisis.model";

@Injectable({ providedIn: "root" })
export class ValoresReferenciaService extends CrudHttpService<ValorReferencia> {
  protected readonly endpoint = "valores-referencia";
}
