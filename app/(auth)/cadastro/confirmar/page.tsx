import { Suspense } from 'react'
import ConfirmarEmailClient from './ConfirmarEmailClient'

export default function ConfirmarEmailPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmarEmailClient />
    </Suspense>
  )
}
