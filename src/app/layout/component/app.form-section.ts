import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Sección de un formulario/diálogo: encabezado con icono y descripción opcional
 * seguido del contenido proyectado (normalmente un grid de campos).
 */
@Component({
    selector: 'app-form-section',
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { class: 'block' },
    template: `
        <section class="flex flex-col gap-4">
            <div class="flex items-start gap-3 border-b border-surface pb-3">
                @if (icon()) {
                    <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary dark:bg-primary-400/15" aria-hidden="true">
                        <i [class]="icon() + ' text-sm'"></i>
                    </span>
                }
                <div class="min-w-0">
                    <h3 class="m-0! text-sm! font-semibold! uppercase tracking-wide text-surface-700 dark:text-surface-200">{{ title() }}</h3>
                    @if (description()) {
                        <div class="mt-0.5 text-xs text-muted-color">{{ description() }}</div>
                    }
                </div>
            </div>
            <ng-content />
        </section>
    `
})
export class AppFormSection {
    readonly title = input.required<string>();
    readonly description = input<string>('');
    readonly icon = input<string>('');
}
