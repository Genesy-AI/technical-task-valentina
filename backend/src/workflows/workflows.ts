import { proxyActivities } from '@temporalio/workflow'
import type * as activities from './activities'
import type { PhoneProviderInput } from './activities/phoneProviders'

const { verifyEmail } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 second',
  scheduleToCloseTimeout: '10 seconds',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumInterval: '2 seconds',
    maximumAttempts: 3,
  },
})

const phoneActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '6 seconds',
  scheduleToCloseTimeout: '30 seconds',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumInterval: '5 seconds',
    maximumAttempts: 3,
  },
})

export async function verifyEmailWorkflow(email: string): Promise<boolean> {
  return await verifyEmail(email)
}

export async function enrichPhoneWorkflow(input: PhoneProviderInput): Promise<string | null> {
  const persistResult = async (phone: string | null, status: 'found' | 'no_data' | 'failed') =>
    phoneActivities.savePhoneEnrichmentResult({ leadId: input.leadId, phone, status })

  try {
    let failedProviders = 0
    const tryProvider = async (lookup: () => Promise<string | null>) => {
      try {
        return await lookup()
      } catch {
        failedProviders++
        return null
      }
    }

    const orionPhone = await tryProvider(() => phoneActivities.lookupOrionPhone(input))
    if (orionPhone) {
      await persistResult(orionPhone, 'found')
      return orionPhone
    }

    const astraPhone = await tryProvider(() => phoneActivities.lookupAstraPhone(input))
    if (astraPhone) {
      await persistResult(astraPhone, 'found')
      return astraPhone
    }

    const nimbusPhone = await tryProvider(() => phoneActivities.lookupNimbusPhone(input))
    const finalStatus = nimbusPhone ? 'found' : failedProviders > 0 ? 'failed' : 'no_data'
    await persistResult(nimbusPhone, finalStatus)
    return nimbusPhone
  } catch (error) {
    await persistResult(null, 'failed')
    throw error
  }
}
