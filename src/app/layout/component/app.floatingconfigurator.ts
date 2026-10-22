import { Component, computed, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { LayoutService } from '../service/layout.service';

@Component({
    selector: 'app-floating-configurator',
    imports: [ButtonModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div class="flex gap-4 top-8 right-8" [class.fixed]="float()">
            <p-button type="button" (onClick)="toggleDarkMode()" [rounded]="true" [icon]="isDarkTheme() ? 'pi pi-moon' : 'pi pi-sun'" severity="secondary" />
        </div>
    `
})
export class AppFloatingConfigurator {
    LayoutService = inject(LayoutService);

    float = input<boolean>(true);

    isDarkTheme = computed(() => this.LayoutService.layoutConfig().darkTheme);

    toggleDarkMode() {
        this.LayoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
    }
}
