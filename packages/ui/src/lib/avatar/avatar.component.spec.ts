import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarComponent } from './avatar.component';

describe('AvatarComponent', () => {
  let fixture: ComponentFixture<AvatarComponent>;
  let hostEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarComponent);
    fixture.componentRef.setInput('name', 'Lucas Nascimento');
    fixture.componentRef.setInput('size', 'md');
    fixture.detectChanges();
    hostEl = fixture.nativeElement;
  });

  it('renders initials when no src is provided', () => {
    const initialsEl = hostEl.querySelector('.tkf-avatar__initials');
    expect(initialsEl).toBeTruthy();
    expect(initialsEl?.textContent).toBe('LN');
    expect(hostEl.getAttribute('role')).toBe('img');
    expect(hostEl.getAttribute('aria-label')).toBe('Lucas Nascimento');
  });

  it('renders img element when src is provided', () => {
    fixture.componentRef.setInput('src', 'https://example.com/photo.png');
    fixture.detectChanges();
    const imgEl = hostEl.querySelector('img.tkf-avatar__img') as HTMLImageElement;
    expect(imgEl).toBeTruthy();
    expect(imgEl.src).toBe('https://example.com/photo.png');
  });
});
