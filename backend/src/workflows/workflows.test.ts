import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PhoneProviderInput } from './activities/phoneProviders'

const phoneActivities = vi.hoisted(() => ({
  verifyEmail: vi.fn(),
  lookupOrionPhone: vi.fn(),
  lookupAstraPhone: vi.fn(),
  lookupNimbusPhone: vi.fn(),
  savePhoneEnrichmentResult: vi.fn(),
}))

vi.mock('@temporalio/workflow', () => ({
  proxyActivities: () => phoneActivities,
}))

import { enrichPhoneWorkflow } from './workflows'

const input: PhoneProviderInput = {
  leadId: 1,
  fullName: 'Ada Lovelace',
  companyWebsite: 'example.com',
  email: 'ada@example.com',
  jobTitle: 'Engineer',
}

describe('enrichPhoneWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    phoneActivities.lookupOrionPhone.mockResolvedValue(null)
    phoneActivities.lookupAstraPhone.mockResolvedValue(null)
    phoneActivities.lookupNimbusPhone.mockResolvedValue(null)
  })

  it('stops after the first provider finds a phone', async () => {
    phoneActivities.lookupOrionPhone.mockResolvedValue('+1 555 0100')

    await expect(enrichPhoneWorkflow(input)).resolves.toBe('+1 555 0100')
    expect(phoneActivities.lookupAstraPhone).not.toHaveBeenCalled()
    expect(phoneActivities.lookupNimbusPhone).not.toHaveBeenCalled()
    expect(phoneActivities.savePhoneEnrichmentResult).toHaveBeenCalledWith({
      leadId: 1,
      phone: '+1 555 0100',
      status: 'found',
    })
  })

  it('continues to later providers after an earlier provider fails', async () => {
    phoneActivities.lookupOrionPhone.mockRejectedValue(new Error('Orion unavailable'))
    phoneActivities.lookupAstraPhone.mockResolvedValue('+1 555 0100')

    await expect(enrichPhoneWorkflow(input)).resolves.toBe('+1 555 0100')
    expect(phoneActivities.lookupNimbusPhone).not.toHaveBeenCalled()
    expect(phoneActivities.savePhoneEnrichmentResult).toHaveBeenCalledWith({
      leadId: 1,
      phone: '+1 555 0100',
      status: 'found',
    })
  })

  it('records no data when every provider responds without a phone', async () => {
    await expect(enrichPhoneWorkflow(input)).resolves.toBeNull()
    expect(phoneActivities.savePhoneEnrichmentResult).toHaveBeenCalledWith({
      leadId: 1,
      phone: null,
      status: 'no_data',
    })
  })
})