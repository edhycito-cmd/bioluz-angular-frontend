import { Injectable } from "@angular/core";
import { CrudHttpService } from "./crud-http.service";
import { Personal } from "../models/user.model";

@Injectable({ providedIn: "root" })
export class PersonalService extends CrudHttpService<Personal> {
  protected readonly endpoint = "personal";
}
