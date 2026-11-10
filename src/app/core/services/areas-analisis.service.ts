import { Injectable } from "@angular/core";
import { CrudHttpService } from "./crud-http.service";
import { AreaAnalisis } from "../models/catalogos-analisis.model";

@Injectable({ providedIn: "root" })
export class AreasAnalisisService extends CrudHttpService<AreaAnalisis> {
  protected readonly endpoint = "areas-analisis";
}
