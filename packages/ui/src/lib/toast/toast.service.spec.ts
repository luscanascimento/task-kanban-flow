import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService],
    });
    service = TestBed.inject(ToastService);
  });

  it('pushes success toast to signal state', () => {
    service.success('Task created');
    const items = service.toasts();
    expect(items.length).toBe(1);
    expect(items[0].message).toBe('Task created');
    expect(items[0].variant).toBe('success');
  });

  it('dismisses toast by id', () => {
    service.error('Failed to save');
    const items = service.toasts();
    expect(items.length).toBe(1);
    service.dismiss(items[0].id);
    expect(service.toasts().length).toBe(0);
  });
});
