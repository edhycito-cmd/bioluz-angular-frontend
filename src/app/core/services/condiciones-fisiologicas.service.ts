import { Injectable } from "@angular/core";
import { CrudHttpService } from "./crud-http.service";
import { CondicionFisiologica } from "../models/catalogos-analisis.model";

@Injectable({ providedIn: "root" })
export class CondicionesFisiologicasService extends CrudHttpService<CondicionFisiologica> {
  protected readonly endpoint = "condiciones-fisiologicas";
}
