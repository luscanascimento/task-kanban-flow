import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import type { ColumnDto } from '@tkf/shared-types';

import { environment } from '../../../../environments/environment';
import { HttpColumnRepository } from './http-column.repository';

const BASE = environment.apiBaseUrl;

function column(id: string, position: number): ColumnDto {
  return {
    id,
    boardId: 'b1',
    title: id,
    position,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('HttpColumnRepository', () => {
  let repo: HttpColumnRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HttpColumnRepository, provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(HttpColumnRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('POSTs to /boards/:id/columns/reorder wrapping ids in orderedColumnIds and returns the ordered columns', async () => {
    const orderedIds = ['c2', 'c1', 'c3'];
    const response = [column('c2', 0), column('c1', 1), column('c3', 2)];

    const promise = repo.reorder('b1', orderedIds);

    const req = httpMock.expectOne(`${BASE}/boards/b1/columns/reorder`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ orderedColumnIds: orderedIds });
    req.flush(response);

    await expect(promise).resolves.toEqual(response);
  });
});
