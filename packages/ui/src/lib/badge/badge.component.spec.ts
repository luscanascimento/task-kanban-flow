import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { BadgeComponent } from './badge.component';

describe('BadgeComponent', () => {
  let fixture: ComponentFixture<BadgeComponent>;
  let hostEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BadgeComponent);
    fixture.componentRef.setInput('variant', 'brand');
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    hostEl = fixture.nativeElement;
  });

  it('binds variant and size attributes', () => {
    expect(hostEl.getAttribute('data-variant')).toBe('brand');
    expect(hostEl.getAttribute('data-size')).toBe('sm');
  });

  it('updates attributes when signals change', () => {
    fixture.componentRef.setInput('variant', 'danger');
    fixture.componentRef.setInput('size', 'md');
    fixture.detectChanges();

    expect(hostEl.getAttribute('data-variant')).toBe('danger');
    expect(hostEl.getAttribute('data-size')).toBe('md');
  });
});
