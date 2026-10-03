export interface PhoneProviderInput {
  leadId: number
  fullName: string
  companyWebsite: string
  email: string
  jobTitle: string | null
}

interface OrionResponse {
  phone?: string | null
}

interface AstraResponse {
  phoneNmbr?: string | null
}

interface NimbusResponse {
  number?: number
  countryCode?: string
}

const requiredApiKey = (name: string): string => {
  const apiKey = process.env[name]
  if (!apiKey) throw new Error(`${name} is not configured`)
  return apiKey
}

const postJson = async <T>(url: string, body: object, headers: Record<string, string> = {}): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(4_000),
  })

  if (!response.ok) {
    throw new Error(`Phone provider request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

const normalizePhone = (phone: string | null | undefined): string | null => {
  const normalizedPhone = phone?.trim()
  return normalizedPhone || null
}

export async function lookupOrionPhone(input: PhoneProviderInput): Promise<string | null> {
  const response = await postJson<OrionResponse>(
    'https://api.enginy.ai/api/tmp/orionConnect',
    { fullName: input.fullName, companyWebsite: input.companyWebsite },
    { 'x-auth-me': requiredApiKey('ORION_CONNECT_API_KEY') }
  )
  return normalizePhone(response.phone)
}

export async function lookupAstraPhone(input: PhoneProviderInput): Promise<string | null> {
  const response = await postJson<AstraResponse>(
    'https://api.enginy.ai/api/tmp/astraDialer',
    { email: input.email },
    { apiKey: requiredApiKey('ASTRA_DIALER_API_KEY') }
  )
  return normalizePhone(response.phoneNmbr)
}

export async function lookupNimbusPhone(input: PhoneProviderInput): Promise<string | null> {
  const url = new URL('https://api.enginy.ai/api/tmp/numbusLookup')
  url.searchParams.set('api', requiredApiKey('NIMBUS_LOOKUP_API_KEY'))

  const response = await postJson<NimbusResponse>(url.toString(), {
    email: input.email,
    jobTitle: input.jobTitle,
  })

  if (typeof response.number !== 'number' || !Number.isFinite(response.number)) return null

  const number = String(response.number)
  const countryCode = response.countryCode?.trim()
  return countryCode ? `${countryCode} ${number}` : number
}