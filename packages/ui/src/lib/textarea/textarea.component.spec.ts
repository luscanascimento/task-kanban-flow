import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { TextareaComponent } from './textarea.component';

describe('TextareaComponent', () => {
  let fixture: ComponentFixture<TextareaComponent>;
  let textareaEl: HTMLTextAreaElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextareaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TextareaComponent);
    fixture.detectChanges();
    textareaEl = fixture.nativeElement;
  });

  it('writes and sets value through ControlValueAccessor', () => {
    fixture.componentInstance.writeValue('Initial text');
    expect(textareaEl.value).toBe('Initial text');
  });

  it('reflects data-invalid attribute', () => {
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();
    expect(textareaEl.getAttribute('data-invalid')).not.toBeNull();
  });

  it('propagates value on input event', () => {
    let captured = '';
    fixture.componentInstance.registerOnChange((val) => {
      captured = val;
    });
    textareaEl.value = 'Updated text';
    textareaEl.dispatchEvent(new Event('input'));
    expect(captured).toBe('Updated text');
  });
});
