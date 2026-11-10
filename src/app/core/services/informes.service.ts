import { Injectable } from "@angular/core";
import { CrudHttpService } from "./crud-http.service";
import { Informe } from "../models/laboratorio.model";

@Injectable({ providedIn: "root" })
export class InformesService extends CrudHttpService<Informe> {
  protected readonly endpoint = "informes";
}
