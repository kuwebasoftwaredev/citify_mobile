import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DealsPage } from '../deals/deals.page';
import { DealsPageRoutingModule } from './deals-routing.module';
import { BlogListComponent } from '../../shared/blog-list/blog-list/blog-list.component';
import { MapGlComponent } from 'src/app/shared/components/map-gl/map-gl.component';
import { FilterModalComponent } from 'src/app/shared/modals/filter-modal/filter-modal/filter-modal.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    DealsPageRoutingModule,
    BlogListComponent,
    MapGlComponent,
    FilterModalComponent,
  ],
  declarations: [DealsPage],
})
export class DealsPageModule {}
