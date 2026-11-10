import { Injectable } from "@angular/core";
import { CrudHttpService } from "./crud-http.service";
import { Institucion } from "../models/institucion.model";

@Injectable({ providedIn: "root" })
export class InstitucionesService extends CrudHttpService<Institucion> {
  protected readonly endpoint = "instituciones";
}
