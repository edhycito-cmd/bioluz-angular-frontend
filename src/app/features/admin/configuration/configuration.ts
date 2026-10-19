import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from "@angular/core";
import { FormField, form, submit } from "@angular/forms/signals";
import { CheckboxModule } from "@openng/optimus-ui/checkbox";
import { ButtonModule } from "@openng/optimus-ui/button";
import { MessageModule } from "@openng/optimus-ui/message";
import { LayoutService } from "../../../layout/service/layout.service";

interface ConfigurationModel {
  darkTheme: boolean;
  overlayMenu: boolean;
}

@Component({
  selector: "app-configuration",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormField, CheckboxModule, ButtonModule, MessageModule],
  templateUrl: "./configuration.html",
  styleUrl: "./configuration.scss",
})
export class Configuration {
  private readonly layoutService = inject(LayoutService);

  protected readonly model = signal<ConfigurationModel>({
    darkTheme: this.layoutService.layoutConfig().darkTheme,
    overlayMenu: this.layoutService.layoutConfig().menuMode === "overlay",
  });

  protected readonly configForm = form(this.model, () => {});

  protected readonly guardado = signal(false);

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.guardado.set(false);

    submit(this.configForm, async () => {
      const { darkTheme, overlayMenu } = this.model();
      this.layoutService.layoutConfig.update((config) => ({
        ...config,
        darkTheme,
        menuMode: overlayMenu ? "overlay" : "static",
      }));
      this.guardado.set(true);
      return undefined;
    });
  }
}
