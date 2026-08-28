import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { SkeletonComponent } from './skeleton.component';

describe('SkeletonComponent', () => {
  let fixture: ComponentFixture<SkeletonComponent>;
  let hostEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentRef.setInput('width', '100px');
    fixture.componentRef.setInput('height', '20px');
    fixture.componentRef.setInput('radius', 'full');
    fixture.detectChanges();
    hostEl = fixture.nativeElement;
  });

  it('sets aria-hidden and data-radius attributes', () => {
    expect(hostEl.getAttribute('aria-hidden')).toBe('true');
    expect(hostEl.getAttribute('data-radius')).toBe('full');
  });

  it('applies custom width and height styles', () => {
    expect(hostEl.style.width).toBe('100px');
    expect(hostEl.style.height).toBe('20px');
  });
});
