import { Injectable } from "@angular/core";
import { CrudHttpService } from "./crud-http.service";
import { Sucursal } from "../models/empresa.model";

@Injectable({ providedIn: "root" })
export class SucursalesService extends CrudHttpService<Sucursal> {
  protected readonly endpoint = "sucursales";
}
