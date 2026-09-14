'use client'

import React, { useState } from 'react'
import { PlanModal } from '@/components/organisms/PlanModal'
import type { Plan } from '@/components/organisms/PlanModal'

interface Props {
  currentPlan: Plan
}

export function AssinaturaUpgradeButton({ currentPlan }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'var(--brand)',
          color: 'var(--white)',
          padding: '10px 20px',
          borderRadius: 'var(--r)',
          fontSize: 14,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Ver planos →
      </button>

      <PlanModal
        open={open}
        onClose={() => setOpen(false)}
        currentPlan={currentPlan}
        mode="upgrade"
      />
    </>
  )
}
