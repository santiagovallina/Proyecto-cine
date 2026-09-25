import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Candy } from './candy';

describe('Candy', () => {
  let component: Candy;
  let fixture: ComponentFixture<Candy>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Candy],
    }).compileComponents();

    fixture = TestBed.createComponent(Candy);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
