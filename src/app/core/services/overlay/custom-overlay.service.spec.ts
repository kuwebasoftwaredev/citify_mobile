import { TestBed } from '@angular/core/testing';

import { CustomOverlay } from './custom-overlay.service';

describe('Overlay', () => {
  let service: CustomOverlay;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomOverlay);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
