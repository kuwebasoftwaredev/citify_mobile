import { TestBed } from '@angular/core/testing';
import { ImageEmbedService } from './image-embed.service';

describe('ImageEmbedService', () => {
  let service: ImageEmbedService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageEmbedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
