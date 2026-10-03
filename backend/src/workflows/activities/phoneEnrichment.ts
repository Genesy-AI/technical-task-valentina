import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function savePhoneEnrichmentResult(input: {
  leadId: number
  phone: string | null
  status: 'found' | 'no_data' | 'failed'
}): Promise<void> {
  await prisma.lead.update({
    where: { id: input.leadId },
    data: {
      phone: input.phone,
      phoneEnrichmentStatus: input.status,
    },
  })
}