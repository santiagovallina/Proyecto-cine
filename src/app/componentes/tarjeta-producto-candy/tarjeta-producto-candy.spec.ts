import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TarjetaProductoCandy } from './tarjeta-producto-candy';

describe('TarjetaProductoCandy', () => {
  let component: TarjetaProductoCandy;
  let fixture: ComponentFixture<TarjetaProductoCandy>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TarjetaProductoCandy],
    }).compileComponents();

    fixture = TestBed.createComponent(TarjetaProductoCandy);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
