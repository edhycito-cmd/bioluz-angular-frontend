import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Estado vacío para tablas y listados: icono, mensaje y acción opcional proyectada. */
@Component({
    selector: 'app-empty-state',
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { class: 'block' },
    template: `
        <div class="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <span class="flex size-14 items-center justify-center rounded-full bg-surface-100 text-muted-color dark:bg-surface-800" aria-hidden="true">
                <i [class]="icon() + ' text-2xl'"></i>
            </span>
            <div class="text-base font-medium text-surface-900 dark:text-surface-0">{{ title() }}</div>
            @if (description()) {
                <div class="max-w-md text-sm text-muted-color">{{ description() }}</div>
            }
            <div class="mt-2 empty:hidden"><ng-content /></div>
        </div>
    `
})
export class AppEmptyState {
    readonly title = input.required<string>();
    readonly description = input<string>('');
    readonly icon = input<string>('pi pi-inbox');
}
