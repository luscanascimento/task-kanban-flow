import { http, HttpResponse } from 'msw';

import type { ApiKeyDto, ApiKeyScope, CreatedApiKeyDto } from '@tkf/shared-types';

/**
 * Stateful MSW backend for API-key management, mirroring `apps/api`'s
 * `/api/v1/keys`:
 *  - the plaintext key is returned ONCE on creation, then only metadata,
 *  - revoke is a soft delete (the key stays listed, flagged `revoked`).
 * State lives for the tab's lifetime.
 */
interface KeyRecord extends ApiKeyDto {
  readonly key: string;
}

const keys: KeyRecord[] = [];
let seq = 0;

function randomToken(): string {
  // A demo-grade random token; the real backend uses 32 bytes of CSPRNG entropy.
  const rand = (): string => Math.random().toString(36).slice(2);
  return `tkf_${rand()}${rand()}${rand()}`.slice(0, 47);
}

export const apiKeysHandlers = [
  http.get('*/keys', () => {
    const metadata: ApiKeyDto[] = keys.map(({ key: _key, ...meta }) => meta);
    return HttpResponse.json(metadata);
  }),

  http.post('*/keys', async ({ request }) => {
    const body = (await request.json()) as { name?: string; scope?: ApiKeyScope };
    if (!body.name || !body.name.trim()) {
      return HttpResponse.json(
        { statusCode: 400, code: 'validation_error', message: 'Key name is required.' },
        { status: 400 },
      );
    }
    const plaintext = randomToken();
    const record: KeyRecord = {
      id: `key_${(++seq).toString(36).padStart(4, '0')}`,
      name: body.name.trim(),
      display: plaintext.slice(0, 12),
      scope: body.scope === 'read_write' ? 'read_write' : 'read',
      createdAt: new Date().toISOString(),
      revoked: false,
      key: plaintext,
    };
    keys.unshift(record);
    const created: CreatedApiKeyDto = { ...record };
    return HttpResponse.json(created, { status: 201 });
  }),

  http.delete('*/keys/:id', ({ params }) => {
    const record = keys.find((k) => k.id === params['id']);
    if (!record || record.revoked) {
      return HttpResponse.json(
        { statusCode: 404, code: 'not_found', message: 'API key not found.' },
        { status: 404 },
      );
    }
    const index = keys.indexOf(record);
    keys[index] = { ...record, revoked: true };
    return new HttpResponse(null, { status: 204 });
  }),
];
