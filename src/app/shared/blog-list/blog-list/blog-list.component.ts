import { Component, OnInit } from '@angular/core';
import {
  InfiniteScrollCustomEvent,
  IonAvatar,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular';
import { LoginPage } from 'src/app/pages/login/login/login.page';
@Component({
  standalone: true,
  imports: [IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonList],
  selector: 'app-blog-list',
  templateUrl: './blog-list.component.html',
  styleUrls: ['./blog-list.component.scss'],
})
export class BlogListComponent implements OnInit {
  items: string[] = [];

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    this.generateItems();
  }

  private generateItems() {
    const count = this.items.length + 1;
    for (let i = 0; i < 50; i++) {
      this.items.push(`Item ${count + i}`);
    }
  }

  onIonInfinite(event: InfiniteScrollCustomEvent) {
    console.log('x');

    setTimeout(() => {
      this.generateItems();
      event.target.complete();
    }, 1500);
  }

  async openBlog() {
    const modal = await this.modalCtrl.create({
      component: LoginPage,
      breakpoints: [0, 0.3, 0.5, 0.8],
      initialBreakpoint: 0.5,
      backdropBreakpoint: 0.3,
      handle: true,
    });
    await modal.present();
  }
}
