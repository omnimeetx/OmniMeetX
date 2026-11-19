'use client'

import { Toaster as HotToaster } from 'react-hot-toast'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { Toaster as RadixToaster } from '@/components/ui/toaster'

/**
 * Pages call three toast APIs (sonner, react-hot-toast, and the shadcn
 * `useToast` hook). Each only renders if its host is mounted, so all three
 * live here once, in the root layout.
 */
export default function Toasters() {
  return (
    <>
      <SonnerToaster theme="light" position="top-right" closeButton />
      <HotToaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--panel-3)',
            color: 'var(--text)',
            border: '1px solid var(--line-strong)',
          },
        }}
      />
      <RadixToaster />
    </>
  )
}
