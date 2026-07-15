import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import type { AddTaskAttachmentRequestDto, MoveTaskRequestDto, TaskDto } from '@tkf/shared-types';

import { environment } from '../../../../environments/environment';
import { HttpTaskRepository } from './http-task.repository';

const BASE = environment.apiBaseUrl;

function task(id: string, columnId: string, position: number): TaskDto {
  return {
    id,
    boardId: 'b1',
    columnId,
    title: id,
    priority: 'medium',
    status: 'backlog',
    position,
    labels: [],
    checklistItems: [],
    attachments: [],
    commentCount: 0,
    attachmentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('HttpTaskRepository', () => {
  let repo: HttpTaskRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HttpTaskRepository, provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(HttpTaskRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('POSTs to /tasks/:id/move with the move payload and returns the parsed task', async () => {
    const payload: MoveTaskRequestDto = { targetColumnId: 'done', targetPosition: 2 };
    const moved = task('t1', 'done', 2);

    const promise = repo.move('t1', payload);

    const req = httpMock.expectOne(`${BASE}/tasks/t1/move`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(moved);

    await expect(promise).resolves.toEqual(moved);
  });

  it('POSTs to /tasks/:id/attachments with the attachment body and returns the updated task', async () => {
    const payload: AddTaskAttachmentRequestDto = {
      name: 'spec.pdf',
      mimeType: 'application/pdf',
      url: 'data:application/pdf;base64,AAA',
      sizeBytes: 1024,
    };
    const updated = task('t1', 'todo', 0);

    const promise = repo.addAttachment('t1', payload);

    const req = httpMock.expectOne(`${BASE}/tasks/t1/attachments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(updated);

    await expect(promise).resolves.toEqual(updated);
  });

  it('DELETEs /tasks/:id/attachments/:attachmentId and returns the updated task', async () => {
    const updated = task('t1', 'todo', 0);

    const promise = repo.removeAttachment('t1', 'att9');

    const req = httpMock.expectOne(`${BASE}/tasks/t1/attachments/att9`);
    expect(req.request.method).toBe('DELETE');
    req.flush(updated);

    await expect(promise).resolves.toEqual(updated);
  });
});
