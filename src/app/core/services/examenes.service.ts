import { Injectable } from "@angular/core";
import { CrudHttpService } from "./crud-http.service";
import { Examen } from "../models/catalogos-analisis.model";

@Injectable({ providedIn: "root" })
export class ExamenesService extends CrudHttpService<Examen> {
  protected readonly endpoint = "examenes";
}
