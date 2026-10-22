import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { FormField, form, submit } from "@angular/forms/signals";
import { ButtonModule } from "@openng/optimus-ui/button";
import { CheckboxModule } from "@openng/optimus-ui/checkbox";
import { MessageModule } from "@openng/optimus-ui/message";
import { SelectModule } from "@openng/optimus-ui/select";
import { AppConfigurator } from "../../../layout/component/app.configurator";
import { LayoutService } from "../../../layout/service/layout.service";
import { ThemeService } from "../../../layout/service/theme.service";
import { PermissionsService } from "../../../core/services/permissions.service";

type MenuMode = "static" | "overlay";

interface ConfigurationModel {
  darkTheme: boolean;
  menuMode: MenuMode;
}

interface OpcionMenuMode {
  label: string;
  value: MenuMode;
}

@Component({
  selector: "app-configuration",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    AppConfigurator,
    FormField,
    FormsModule,
    CheckboxModule,
    SelectModule,
    ButtonModule,
    MessageModule,
  ],
  templateUrl: "./configuration.html",
  styleUrl: "./configuration.scss",
})
export class Configuration implements OnInit {
  private readonly layoutService = inject(LayoutService);
  private readonly themeService = inject(ThemeService);
  private readonly permissions = inject(PermissionsService);

  /** Solo los roles con `update` sobre este menú pueden guardar el tema global. */
  protected readonly puedeEditar = computed(() =>
    this.permissions.can("/admin/configuracion", "update"),
  );

  protected readonly opcionesMenu: OpcionMenuMode[] = [
    { label: "Estático", value: "static" },
    { label: "Superpuesto", value: "overlay" },
  ];

  protected readonly model = signal<ConfigurationModel>({
    darkTheme: this.layoutService.layoutConfig().darkTheme,
    menuMode: this.normalizarMenuMode(
      this.layoutService.layoutConfig().menuMode,
    ),
  });

  protected readonly configForm = form(this.model, () => {});

  protected readonly guardando = signal(false);
  protected readonly guardado = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    // La página siempre parte del valor persistido en la BD, sin depender de
    // cuándo terminó de aplicarse el tema durante el arranque de la SPA.
    this.themeService.reload().subscribe((tema) => {
      if (!tema) return;

      this.model.set({
        darkTheme: tema.darkTheme,
        menuMode: this.normalizarMenuMode(tema.menuMode),
      });
    });
  }

  protected onMenuModeChange(menuMode: string): void {
    this.model.update((model) => ({
      ...model,
      menuMode: this.normalizarMenuMode(menuMode),
    }));
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.puedeEditar()) return;

    this.guardado.set(false);
    this.error.set(null);

    submit(this.configForm, async () => {
      const { darkTheme, menuMode } = this.model();
      const config = {
        ...this.layoutService.layoutConfig(),
        darkTheme,
        menuMode: this.normalizarMenuMode(menuMode),
      };

      this.guardando.set(true);
      try {
        await firstValueFrom(this.themeService.save(config));
        this.guardado.set(true);
      } catch (err: unknown) {
        this.error.set(this.extractErrorMessage(err));
      } finally {
        this.guardando.set(false);
      }
      return undefined;
    });
  }

  private normalizarMenuMode(menuMode: string): MenuMode {
    return menuMode === "overlay" ? "overlay" : "static";
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
    }
    return "No se pudo guardar la configuración. Intentá de nuevo.";
  }
}
