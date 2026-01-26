import { Component, Input, OnInit, TemplateRef } from '@angular/core';
import { AddProductPage } from '../../add-product.page';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-variant-form',
  templateUrl: './variant-form.component.html',
  styleUrls: ['./variant-form.component.scss'],
  imports: [CommonModule, IonicModule],
})
export class VariantFormComponent implements OnInit {
  @Input() form!: TemplateRef<any>;

  constructor() {}

  ngOnInit() {}
}
