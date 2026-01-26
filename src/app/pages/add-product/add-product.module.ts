import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AddProductPage } from '../add-product/add-product.page';
import { AddProductPageRoutingModule } from './add-product-routing.module';
import { MatIconModule } from '@angular/material/icon';
import { ImageCropperComponent } from 'ngx-image-cropper';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { EditImageComponent } from 'src/app/shared/components/edit-image/edit-image.component';
import { PriceFormatDirective } from 'src/app/core/directives/price-format/price-format.directive';
import { NoLeadingZeroDirective } from 'src/app/core/directives/price-format/no-leading-zero.directive';
import { VariantLabelPipe } from 'src/app/shared/pipes/variant-label/variant-label.pipe';
import { SelectedVariantLabelPipe } from 'src/app/shared/pipes/selected-variant-label/selected-variant-label.pipe';
import { VariantFormComponent } from 'src/app/shared/swipe-sheets/variant-form/variant-form/variant-form.component';

@NgModule({
  imports: [
    // Modules
    IonicModule,
    CommonModule,
    FormsModule,
    AddProductPageRoutingModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,

    // Components
    EditImageComponent,
    VariantFormComponent,

    // Pipes
    SelectedVariantLabelPipe,
  ],
  declarations: [AddProductPage],
})
export class AddProductPageModule {}
