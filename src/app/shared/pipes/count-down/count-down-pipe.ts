import { ChangeDetectorRef, NgZone, Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'countDown',
})
export class CountDownPipe implements PipeTransform {
  private timer: any;
  private remaining = 0;
  private started = false;
  private callback: (val: string) => void = () => {};

  constructor(private cdRef: ChangeDetectorRef, private ngZone: NgZone) {}

  transform(seconds: number, onChange?: (val: string) => void): string {
    if (!seconds || seconds <= 0) return '00:00';

    if (!this.started) {
      this.remaining = seconds;
      this.callback = onChange || (() => {});
      this.startTimer();
      this.started = true;
    }

    const formatted = this.formatTime(this.remaining);
    this.callback(formatted);
    return formatted;
  }

  private startTimer() {
    this.removeTimer();
    const tick = () => {
      if (this.remaining > 0) {
        this.remaining--;
        this.cdRef.markForCheck();
        this.ngZone.runOutsideAngular(() => {
          this.timer = setTimeout(() => {
            this.ngZone.run(tick);
          }, 1000);
        });
      } else {
        this.removeTimer();
      }
    };
    tick();
  }

  private removeTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  ngOnDestroy(): void {
    this.removeTimer();
  }
}
