import { TkfApiError, TkfClient } from './client';

describe('TkfClient', () => {
  const client = new TkfClient({ baseUrl: 'http://api.test/', apiKey: 'tkf_abc' });
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('sends the API key as a Bearer token and parses JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ items: [] }),
    });
    const result = await client.get<{ items: unknown[] }>('/api/v1/boards');
    expect(result).toEqual({ items: [] });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api.test/api/v1/boards');
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer tkf_abc');
  });

  it('throws a typed error carrying the API error code on failure', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () =>
        JSON.stringify({ code: 'invalid_api_key', message: 'Invalid or revoked API key' }),
    });
    await expect(client.get('/api/v1/boards')).rejects.toMatchObject({
      name: 'TkfApiError',
      statusCode: 401,
      code: 'invalid_api_key',
    });
  });

  it('sends a JSON body with content-type on POST', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ id: 'x' }),
    });
    await client.post('/api/v1/teams', { name: 'T' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ name: 'T' }));
  });

  it('exposes TkfApiError for instanceof checks', () => {
    expect(new TkfApiError(404, 'not_found', 'x')).toBeInstanceOf(Error);
  });
});
