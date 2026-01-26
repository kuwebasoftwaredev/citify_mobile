import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DealsPage } from '../deals/deals.page';
import { DealsPageRoutingModule } from './deals-routing.module';
import { BlogListComponent } from '../../shared/blog-list/blog-list/blog-list.component';
import { MapComponent } from 'src/app/shared/components/map/map/map.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    DealsPageRoutingModule,
    BlogListComponent,
    MapComponent,
  ],
  declarations: [DealsPage],
})
export class DealsPageModule {}
