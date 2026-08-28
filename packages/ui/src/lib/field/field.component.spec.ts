import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { FieldComponent } from './field.component';

describe('FieldComponent', () => {
  let fixture: ComponentFixture<FieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FieldComponent);
    fixture.componentRef.setInput('label', 'Username');
    fixture.componentRef.setInput('hint', 'Choose a unique username');
    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();
  });

  it('renders label with required indicator', () => {
    const labelEl = fixture.nativeElement.querySelector('.tkf-field__label');
    const requiredEl = fixture.nativeElement.querySelector('.tkf-field__required');
    expect(labelEl.textContent).toContain('Username');
    expect(requiredEl).toBeTruthy();
  });

  it('renders hint when there is no error', () => {
    const hintEl = fixture.nativeElement.querySelector('.tkf-field__hint');
    expect(hintEl.textContent).toBe('Choose a unique username');
  });

  it('renders error message with role alert and hides hint', () => {
    fixture.componentRef.setInput('error', 'Username already taken');
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.tkf-field__error');
    const hintEl = fixture.nativeElement.querySelector('.tkf-field__hint');

    expect(errorEl.textContent).toBe('Username already taken');
    expect(errorEl.getAttribute('role')).toBe('alert');
    expect(hintEl).toBeNull();
  });
});
