export type NotifyDetail = { message: string; variant?: 'info' | 'error' }

const EVENT = 'urbanmind-notify'

export function notify(message: string, variant: NotifyDetail['variant'] = 'info') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<NotifyDetail>(EVENT, { detail: { message, variant } }))
}

/** Subscribe in React: useEffect(() => subscribeNotify(setToast), []) */
export function subscribeNotify(listener: (detail: NotifyDetail) => void) {
  const handler = (ev: Event) => {
    const ce = ev as CustomEvent<NotifyDetail>
    if (ce.detail?.message) listener(ce.detail)
  }
  window.addEventListener(EVENT, handler as EventListener)
  return () => window.removeEventListener(EVENT, handler as EventListener)
}
