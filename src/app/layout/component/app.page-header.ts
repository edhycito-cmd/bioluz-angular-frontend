import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Cabecera estándar de página: icono, título, descripción y zona de acciones.
 * Las acciones (botones) se proyectan con `<app-page-header>…</app-page-header>`.
 * Solo usa utilidades Tailwind; no define estilos propios.
 */
@Component({
    selector: 'app-page-header',
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { class: 'block' },
    template: `
        <header class="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex min-w-0 items-center gap-3 sm:gap-4">
                @if (icon()) {
                    <span
                        class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary dark:bg-primary-400/15 sm:size-12"
                        aria-hidden="true"
                    >
                        <i [class]="icon() + ' text-xl'"></i>
                    </span>
                }
                <div class="min-w-0">
                    <h1 class="m-0! truncate text-xl! font-semibold! leading-tight! text-surface-900 dark:text-surface-0 sm:text-2xl!">
                        {{ title() }}
                    </h1>
                    @if (subtitle()) {
                        <div class="mt-1 text-sm leading-snug text-muted-color">{{ subtitle() }}</div>
                    }
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-2 sm:justify-end empty:hidden">
                <ng-content />
            </div>
        </header>
    `
})
export class AppPageHeader {
    readonly title = input.required<string>();
    readonly subtitle = input<string>('');
    readonly icon = input<string>('');
}
