import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Inject, OnInit, Output } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IonButton, IonText } from '@ionic/angular/standalone';

@Component({
  selector: 'app-pop-up-modal',
  templateUrl: './pop-up-modal.component.html',
  styleUrls: ['./pop-up-modal.component.scss'],
  imports: [IonText, IonButton, CommonModule],
})
export class PopUpModalComponent implements OnInit {
  @Output() result = new EventEmitter();
  safeHtml: SafeHtml;

  constructor(
    private dialog: MatDialogRef<PopUpModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private sanitizer: DomSanitizer,
  ) {
    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(
      this.data.customBtnText,
    );
  }

  ngOnInit(): void {}

  delete() {
    this.result.emit(true);
    this.close();
  }

  yes() {
    this.dialog.close(true);
  }

  no() {
    this.dialog.close(false);
  }

  close() {
    this.dialog.close();
  }
}
