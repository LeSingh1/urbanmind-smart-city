import { useEffect, useState } from 'react'

export interface TypewriterOptions {
  speedMs?: number
  startDelayMs?: number
}

export function useTypewriter(text: string, { speedMs = 22, startDelayMs = 0 }: TypewriterOptions = {}) {
  const [output, setOutput] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setOutput('')
    setDone(false)
    if (!text) { setDone(true); return }
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setOutput(text)
      setDone(true)
      return
    }
    let cancelled = false
    let i = 0
    const tick = () => {
      if (cancelled) return
      i += 1
      setOutput(text.slice(0, i))
      if (i >= text.length) { setDone(true); return }
      timer = window.setTimeout(tick, speedMs)
    }
    let timer = window.setTimeout(tick, startDelayMs)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [text, speedMs, startDelayMs])

  return { output, done }
}
