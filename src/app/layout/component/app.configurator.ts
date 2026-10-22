import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { SelectButtonModule } from "@openng/optimus-ui/selectbutton";
import { ThemeService } from "../service/theme.service";

/**
 * Selector de colores del tema (paleta primaria, superficie y preset).
 *
 * No tiene posicionamiento propio: se embebe en `/admin/configuracion`.
 * Cada cambio actualiza `LayoutService` para la vista previa; la persistencia
 * global la ejecuta la página con `ThemeService.save()`.
 */
@Component({
  selector: "app-configurator",
  imports: [FormsModule, SelectButtonModule],
  template: `
    <div class="flex flex-col gap-4">
      <div>
        <span class="text-sm text-muted-color font-semibold">Primary</span>
        <div class="pt-2 flex gap-2 flex-wrap justify-start">
          @for (primaryColor of theme.primaryColors(); track primaryColor.name) {
            <button
              type="button"
              [title]="primaryColor.name"
              (click)="theme.setPrimaryColor(primaryColor)"
              [class.outline]="primaryColor.name === theme.selectedPrimaryColor()"
              [class.outline-primary]="
                primaryColor.name === theme.selectedPrimaryColor()
              "
              class="cursor-pointer w-5 h-5 rounded-full flex shrink-0 items-center justify-center outline-offset-1 shadow"
              [style]="{
                'background-color':
                  primaryColor?.name === 'noir'
                    ? 'var(--text-color)'
                    : primaryColor?.palette?.['500'],
              }"
            ></button>
          }
        </div>
      </div>
      <div>
        <span class="text-sm text-muted-color font-semibold">Surface</span>
        <div class="pt-2 flex gap-2 flex-wrap justify-start">
          @for (surface of theme.surfaces; track surface.name) {
            <button
              type="button"
              [title]="surface.name"
              (click)="theme.setSurfaceColor(surface)"
              class="cursor-pointer w-5 h-5 rounded-full flex shrink-0 items-center justify-center p-0 outline-offset-1"
              [class]="{
                'outline outline-primary': theme.selectedSurfaceColor()
                  ? theme.selectedSurfaceColor() === surface.name
                  : theme.isDarkTheme()
                    ? surface.name === 'zinc'
                    : surface.name === 'slate',
              }"
              [style]="{
                'background-color': surface?.palette?.['500'],
              }"
            ></button>
          }
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-sm text-muted-color font-semibold">Presets</span>
        <p-selectbutton
          [options]="theme.presets"
          [ngModel]="theme.selectedPreset()"
          (ngModelChange)="onPresetChange($event)"
          [ngModelOptions]="{ standalone: true }"
          [allowEmpty]="false"
          size="small"
        />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class AppConfigurator {
  protected readonly theme = inject(ThemeService);

  protected onPresetChange(preset: string) {
    this.theme.setPreset(preset);
  }
}
