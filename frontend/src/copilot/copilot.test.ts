import { describe, expect, it } from 'vitest'
import { buildTemplatePlanningRationale } from './copilot'
import type { DistrictGapReport } from '@/engine/types'

const report: DistrictGapReport = {
  districtId: 'd1',
  districtName: 'North',
  scores: {
    clinicAccess: 50,
    schoolAccess: 80,
    parkAccess: 80,
    transitAccess: 80,
    emergencyAccess: 80,
    fifteenMinuteCityScore: 74,
  },
  populationAffected: 1000,
  severity: 'high',
  largestGap: {
    type: 'clinic',
    coverageGapMeters: 300,
    populationOutsideCoverage: 500,
  },
  recommendedInfrastructureType: 'clinic',
  deterministicReasoning: 'x',
}

describe('copilot template rationale', () => {
  it('includes district and gap type', () => {
    const t = buildTemplatePlanningRationale(report, 'clinic', 1200)
    expect(t).toContain('North')
    expect(t).toContain('clinic')
    expect(t).toContain('1,200')
  })
})
