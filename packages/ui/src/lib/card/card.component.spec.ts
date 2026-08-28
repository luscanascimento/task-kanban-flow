import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';

describe('CardComponent', () => {
  let fixture: ComponentFixture<CardComponent>;
  let hostEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    fixture.detectChanges();
    hostEl = fixture.nativeElement;
  });

  it('updates data-padding and data-interactive attributes', () => {
    expect(hostEl.getAttribute('data-padding')).toBe('md');
    expect(hostEl.getAttribute('data-interactive')).toBeNull();

    fixture.componentRef.setInput('interactive', true);
    fixture.componentRef.setInput('padding', 'lg');
    fixture.detectChanges();

    expect(hostEl.getAttribute('data-interactive')).not.toBeNull();
    expect(hostEl.getAttribute('data-padding')).toBe('lg');
  });
});
