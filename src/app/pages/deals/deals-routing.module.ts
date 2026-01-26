import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DealsPage } from '../deals/deals.page';

const routes: Routes = [
  {
    path: '',
    component: DealsPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DealsPageRoutingModule {}
