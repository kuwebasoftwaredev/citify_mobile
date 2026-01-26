import {
  Component,
  Inject,
  OnInit,
  Optional,
  ViewEncapsulation,
} from '@angular/core';
import {
  ImageCroppedEvent,
  ImageCropperComponent,
  LoadedImage,
} from 'ngx-image-cropper';
import { IonButton } from '@ionic/angular/standalone';
import { OVERLAY_DATA } from '../../tokens/overlay-data.token';
import { blobToBase64 } from 'base64-blob';
import { CustomOverlayRef } from 'src/app/core/services/overlay/custom-overlay.ref';

@Component({
  standalone: true,
  selector: 'app-edit-image',
  templateUrl: './edit-image.component.html',
  styleUrls: ['./edit-image.component.scss'],
  imports: [ImageCropperComponent, IonButton],
  encapsulation: ViewEncapsulation.None,
})
export class EditImageComponent implements OnInit {
  public croppedImage: string = '';

  constructor(
    @Optional() @Inject(OVERLAY_DATA) public data: any,
    private customOverlayRef: CustomOverlayRef,
  ) {}

  ngOnInit() {}

  imageLoaded(image: LoadedImage) {
    // show cropper
  }
  cropperReady() {
    // cropper ready
  }
  loadImageFailed() {
    // show message
  }

  close() {
    this.customOverlayRef.close();
  }

  crop() {
    this.customOverlayRef.crop(this.croppedImage);
  }

  async imageCropped(event: ImageCroppedEvent) {
    this.croppedImage = await blobToBase64(event.blob!);
  }
}
