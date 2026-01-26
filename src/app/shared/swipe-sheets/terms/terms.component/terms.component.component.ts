import { Component, Input, OnInit } from '@angular/core';
import { TermsType } from 'src/app/pages/add-product/add-product.page';
import { IonText, IonContent } from '@ionic/angular/standalone';

@Component({
  imports: [IonContent, IonText],
  selector: 'app-terms.component',
  templateUrl: './terms.component.component.html',
  styleUrls: ['./terms.component.component.scss'],
})
export class TermsComponentComponent implements OnInit {
  @Input() type!: TermsType;
  constructor() {}

  ngOnInit() {}
}
