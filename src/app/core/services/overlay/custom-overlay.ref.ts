import { OverlayRef } from '@angular/cdk/overlay';
import { Subject } from 'rxjs';

export class CustomOverlayRef<T = any> {
  private afterClose = new Subject<T | null>();
  public afterClose$ = this.afterClose.asObservable();

  private afterCrop = new Subject<T | null>();
  public afterCrop$ = this.afterCrop.asObservable();

  constructor(private overlayRef: OverlayRef) {}

  close(result?: T) {
    this.afterClose.next(result ?? null);
    this.killObservers();
    this.overlayRef.dispose();
  }

  crop(result?: T) {
    this.afterCrop.next(result ?? null);
    this.killObservers();
    this.overlayRef.dispose();
  }

  killObservers() {
    this.afterClose.complete();
    this.afterCrop.complete();
  }
}
