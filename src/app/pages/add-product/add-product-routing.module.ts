import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddProductPage } from '../add-product/add-product.page';

const routes: Routes = [
  {
    path: '',
    component: AddProductPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddProductPageRoutingModule {}
