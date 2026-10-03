import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookupAstraPhone, lookupNimbusPhone, lookupOrionPhone, PhoneProviderInput } from './phoneProviders'

const input: PhoneProviderInput = {
  leadId: 1,
  fullName: 'Ada Lovelace',
  companyWebsite: 'example.com',
  email: 'ada@example.com',
  jobTitle: 'Engineer',
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('phone provider activities', () => {
  it('sends Orion the expected payload and authentication header', async () => {
    vi.stubEnv('ORION_CONNECT_API_KEY', 'orion-test-key')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ phone: ' +1 555 0100 ' }) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(lookupOrionPhone(input)).resolves.toBe('+1 555 0100')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.enginy.ai/api/tmp/orionConnect',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-me': 'orion-test-key' },
        body: JSON.stringify({ fullName: 'Ada Lovelace', companyWebsite: 'example.com' }),
      })
    )
  })

  it('normalizes Astra phoneNmbr responses', async () => {
    vi.stubEnv('ASTRA_DIALER_API_KEY', 'astra-test-key')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ phoneNmbr: null }) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(lookupAstraPhone(input)).resolves.toBeNull()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.enginy.ai/api/tmp/astraDialer',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json', apiKey: 'astra-test-key' },
        body: JSON.stringify({ email: 'ada@example.com' }),
      })
    )
  })

  it('sends Nimbus credentials as a query parameter and combines its number with country code', async () => {
    vi.stubEnv('NIMBUS_LOOKUP_API_KEY', 'nimbus-test-key')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ number: 15550100, countryCode: '+1' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(lookupNimbusPhone(input)).resolves.toBe('+1 15550100')

    const [requestUrl, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new URL(requestUrl).searchParams.get('api')).toBe('nimbus-test-key')
    expect(options.body).toBe(JSON.stringify({ email: 'ada@example.com', jobTitle: 'Engineer' }))
  })
})