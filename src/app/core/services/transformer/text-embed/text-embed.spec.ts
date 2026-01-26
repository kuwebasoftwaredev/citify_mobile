import { TestBed } from '@angular/core/testing';

import { TextEmbed } from './text-embed';

describe('TextEmbed', () => {
  let service: TextEmbed;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TextEmbed);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
