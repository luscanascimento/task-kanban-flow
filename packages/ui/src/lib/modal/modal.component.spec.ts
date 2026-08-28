import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';

describe('ModalComponent', () => {
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
    fixture.componentRef.setInput('title', 'Dialog Title');
    fixture.componentRef.setInput('size', 'md');
    fixture.detectChanges();
  });

  it('renders title', () => {
    const titleEl = fixture.nativeElement.querySelector('.tkf-modal__title');
    expect(titleEl.textContent).toContain('Dialog Title');
  });

  it('emits close event when close button is clicked', () => {
    let closed = false;
    fixture.componentInstance.close.subscribe(() => {
      closed = true;
    });
    const closeBtn = fixture.nativeElement.querySelector('.tkf-modal__close') as HTMLButtonElement;
    closeBtn.click();
    expect(closed).toBe(true);
  });

  it('emits close event when clicking on backdrop', () => {
    let closed = false;
    fixture.componentInstance.close.subscribe(() => {
      closed = true;
    });
    const backdrop = fixture.nativeElement.querySelector('.tkf-modal__backdrop') as HTMLElement;
    backdrop.click();
    expect(closed).toBe(true);
  });
});
