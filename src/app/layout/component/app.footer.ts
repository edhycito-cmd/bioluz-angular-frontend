import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-footer',
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div class="layout-footer">
        Desarrollado por
        <a href="https://optimus.openng.org" target="_blank" rel="noopener noreferrer" class="text-primary font-bold hover:underline">MUSPA pl</a>
    </div>`
})
export class AppFooter {}
