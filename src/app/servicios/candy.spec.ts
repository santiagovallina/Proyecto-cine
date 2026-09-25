import { TestBed } from '@angular/core/testing';
import { Candy } from './candy';

describe('Candy', () => {
  let service: Candy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Candy);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
