import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { InputComponent } from './input.component';

describe('InputComponent', () => {
  let fixture: ComponentFixture<InputComponent>;
  let inputEl: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InputComponent);
    fixture.componentRef.setInput('label', 'Email Address');
    fixture.componentRef.setInput('variant', 'outlined');
    fixture.detectChanges();
    inputEl = fixture.nativeElement;
  });

  it('renders input with aria-label and default variant', () => {
    expect(inputEl.getAttribute('aria-label')).toBe('Email Address');
    expect(inputEl.getAttribute('data-variant')).toBe('outlined');
  });

  it('sets data-invalid when invalid is true', () => {
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();
    expect(inputEl.getAttribute('data-invalid')).not.toBeNull();
    expect(inputEl.getAttribute('aria-invalid')).not.toBeNull();
  });

  it('registers on change callback', () => {
    let captured = '';
    fixture.componentInstance.registerOnChange((val) => {
      captured = val;
    });
    inputEl.value = 'user@example.com';
    inputEl.dispatchEvent(new Event('input'));
    expect(captured).toBe('user@example.com');
  });
});
