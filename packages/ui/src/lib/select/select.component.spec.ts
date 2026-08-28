import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectComponent } from './select.component';

describe('SelectComponent', () => {
  let fixture: ComponentFixture<SelectComponent>;
  let selectEl: HTMLSelectElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectComponent);
    fixture.detectChanges();
    selectEl = fixture.nativeElement;
  });

  it('writes and sets value through ControlValueAccessor', () => {
    fixture.componentInstance.writeValue('admin');
    expect(selectEl.value).toBe('admin');
  });

  it('sets data-invalid attribute when invalid is true', () => {
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();
    expect(selectEl.getAttribute('data-invalid')).not.toBeNull();
  });

  it('triggers change callback on change event', () => {
    let captured = '';
    fixture.componentInstance.registerOnChange((val) => {
      captured = val;
    });
    selectEl.value = 'owner';
    selectEl.dispatchEvent(new Event('change'));
    expect(captured).toBe('owner');
  });
});
