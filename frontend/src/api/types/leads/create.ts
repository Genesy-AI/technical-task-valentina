export type LeadsCreateInput = {
  firstName: string
  lastName: string
  email: string
  phone?: string
  yearsCompany?: number
  linkedinUrl?: string
}

export type LeadsCreateOutput = {
  id: number
  firstName: string
  email: string
}
