import { TestBed } from '@angular/core/testing';

import { RequestProductUpdate } from './request-product-update';

describe('RequestProductUpdate', () => {
  let service: RequestProductUpdate;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RequestProductUpdate);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
