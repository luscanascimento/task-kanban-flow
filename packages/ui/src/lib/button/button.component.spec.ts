import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ButtonComponent } from './button.component';

@Component({
  standalone: true,
  imports: [ButtonComponent],
  template: `<button tkf-button>Click me</button>`,
})
class TestHostComponent {}

describe('ButtonComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let buttonEl: HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    buttonEl = fixture.nativeElement.querySelector('button');
  });

  it('renders projected text and default primary variant', () => {
    expect(buttonEl.textContent).toContain('Click me');
    expect(buttonEl.getAttribute('data-variant')).toBe('primary');
  });

  it('renders button element directly', () => {
    const btnFixture = TestBed.createComponent(ButtonComponent);
    btnFixture.componentInstance.variant = 'danger';
    btnFixture.componentInstance.disabled = true;
    btnFixture.detectChanges();

    const el = btnFixture.nativeElement as HTMLElement;
    expect(el.getAttribute('data-variant')).toBe('danger');
    expect(el.getAttribute('data-disabled')).toBe('true');
    expect(el.getAttribute('disabled')).toBe('true');
  });
});
