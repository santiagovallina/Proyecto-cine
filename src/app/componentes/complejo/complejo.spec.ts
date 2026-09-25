import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Complejo } from './complejo';

describe('Complejo', () => {
  let component: Complejo;
  let fixture: ComponentFixture<Complejo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Complejo],
    }).compileComponents();

    fixture = TestBed.createComponent(Complejo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
