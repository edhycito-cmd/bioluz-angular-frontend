import { Injectable } from "@angular/core";
import { CrudHttpService } from "./crud-http.service";
import { Persona } from "../models/user.model";

@Injectable({ providedIn: "root" })
export class PersonasService extends CrudHttpService<Persona> {
  protected readonly endpoint = "personas";
}
