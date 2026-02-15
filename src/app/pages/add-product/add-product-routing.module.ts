import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddProductPage } from '../add-product/add-product.page';

const routes: Routes = [
  {
    path: ':productCode',
    component: AddProductPage,
  },
  {
    path: '',
    component: AddProductPage,
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddProductPageRoutingModule {}
