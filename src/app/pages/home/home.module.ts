import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HomePage } from '../home/home.page';
import { HomePageRoutingModule } from './home-routing.module';
import { BlogListComponent } from '../../shared/blog-list/blog-list/blog-list.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    HomePageRoutingModule,
    BlogListComponent,
  ],
  declarations: [HomePage],
})
export class HomePageModule {}
