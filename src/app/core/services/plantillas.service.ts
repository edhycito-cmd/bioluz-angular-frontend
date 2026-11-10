import { Injectable } from "@angular/core";
import { CrudHttpService } from "./crud-http.service";
import { Plantilla } from "../models/catalogos-analisis.model";

@Injectable({ providedIn: "root" })
export class PlantillasService extends CrudHttpService<Plantilla> {
  protected readonly endpoint = "plantillas";
}
