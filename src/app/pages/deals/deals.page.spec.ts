import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ExploreContainerComponentModule } from '../../explore-container/explore-container.module';

import { DealsPage } from '../deals/deals.page';

describe('DealsPage', () => {
  let component: DealsPage;
  let fixture: ComponentFixture<DealsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DealsPage],
      imports: [IonicModule.forRoot(), ExploreContainerComponentModule],
    }).compileComponents();

    fixture = TestBed.createComponent(DealsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
