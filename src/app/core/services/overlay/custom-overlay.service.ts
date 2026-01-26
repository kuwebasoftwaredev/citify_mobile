import { Component, Injectable, Injector } from '@angular/core';
import { ComponentType, Overlay } from '@angular/cdk/overlay';
import { OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { EditImageComponent } from 'src/app/shared/components/edit-image/edit-image.component';
import { OVERLAY_DATA } from 'src/app/shared/tokens/overlay-data.token';
import { CustomOverlayRef } from './custom-overlay.ref';

@Injectable({
  providedIn: 'root',
})
export class CustomOverlay {
  private overlayRef?: OverlayRef;

  constructor(private overlay: Overlay, private injector: Injector) {}

  open(component: ComponentType<any>, data = {}) {
    this.overlayRef = this.overlay.create({
      hasBackdrop: false,
      positionStrategy: this.overlay.position().global().top('0').left('0'),
      scrollStrategy: this.overlay.scrollStrategies.block(),
    });
    const customOverlayRef = new CustomOverlayRef(this.overlayRef);

    const injector = Injector.create({
      providers: [
        { provide: OVERLAY_DATA, useValue: data },
        { provide: CustomOverlayRef, useValue: customOverlayRef },
      ],
      parent: this.injector,
    });

    const portal = new ComponentPortal(component, null, injector);
    this.overlayRef.attach(portal);

    return customOverlayRef;
  }
}
