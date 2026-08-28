import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingComponent } from './loading.component';

describe('LoadingComponent', () => {
  let fixture: ComponentFixture<LoadingComponent>;
  let hostEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingComponent);
    fixture.componentInstance.label = 'Loading data...';
    fixture.detectChanges();
    hostEl = fixture.nativeElement;
  });

  it('sets role status and aria-live', () => {
    expect(hostEl.getAttribute('role')).toBe('status');
    expect(hostEl.getAttribute('aria-live')).toBe('polite');
    expect(hostEl.textContent).toContain('Loading data...');
  });
});
