import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { LoginPageRoutingModule } from './login-routing.module';
import { LoginPage } from './login.page';
import { SwiperModule } from 'swiper/angular';
import SwiperCore, { Autoplay, Pagination } from 'swiper';
import { MatButtonModule } from '@angular/material/button';

SwiperCore.use([Autoplay, Pagination]);

@NgModule({
  imports: [
    SwiperModule,
    CommonModule,
    FormsModule,
    IonicModule,
    LoginPageRoutingModule,
    MatButtonModule,
  ],
  declarations: [LoginPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class LoginPageModule {}
