export type LeadsEnrichPhoneInput = {
  leadIds: number[]
}

export type LeadsEnrichPhoneOutput = {
  success: boolean
  startedCount: number
  skippedCount: number
  errors: Array<{
    leadId: number
    error: string
  }>
}