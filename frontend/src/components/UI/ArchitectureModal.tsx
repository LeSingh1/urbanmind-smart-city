/**
 * Architecture badge + modal — explains UrbanMind's three-layer design so
 * judges/visitors understand the engine + copilot + validator separation.
 *
 * Opens from a small "How UrbanMind works" badge in the TopBar.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Info, X } from 'lucide-react'

export function ArchitectureBadge() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest"
        style={{
          color: 'var(--color-text-secondary)',
          borderColor: 'var(--color-border-subtle)',
          background: 'var(--color-bg-panel)',
        }}
      >
        <Info size={11} />
        How UrbanMind works
      </button>
      {open && createPortal(
        <AnimatePresence>
          <ArchitectureDialog onClose={() => setOpen(false)} />
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

function ArchitectureDialog({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 640,
          maxWidth: '94vw',
          maxHeight: '88vh',
          overflow: 'auto',
          background: 'var(--color-bg-panel)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 12,
          boxShadow: '0 16px 70px rgba(0,0,0,0.65)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div>
            <div className="font-display text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              How UrbanMind Works
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
              Bounded planning decision system
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg" style={{ border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}>
            <X size={14} />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <Step
            n={1}
            title="Compute service gaps"
            body="The deterministic engine analyzes each district for clinic, school, park, transit, and emergency access. Same inputs always produce the same gap reports."
          />
          <Step
            n={2}
            title="Rank district severity"
            body="Districts are scored on 6 dimensions and sorted by gap size and population affected. Severity is rule-based, not learned."
          />
          <Step
            n={3}
            title="Generate planning alerts"
            body="The top 1 to 5 most critical gaps surface as alerts. Alert text is generated from engine numbers via templates, not from an LLM."
          />
          <Step
            n={4}
            title="Validate AI recommendations"
            body="Every copilot suggestion runs through 12 validation rules: must address a real gap, must lie inside district bounds, must avoid invalid terrain, must improve at least one metric, must have plausible cost and population. Failed rules drop confidence; 3 or more failures drop the recommendation entirely."
          />
          <Step
            n={5}
            title="Apply plan to map"
            body="Only validated recommendations can modify map state. Failed recommendations are logged for review but never enter the simulation."
          />
          <Step
            n={6}
            title="Compare before/after metrics"
            body="Impact is measured against the deterministic engine baseline, not LLM-generated numbers. Cost and population served come from a hardcoded table."
          />
          <div className="mt-2 rounded-lg p-3 font-mono text-[11px] leading-relaxed" style={{ border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>
            <span style={{ color: 'var(--color-accent-cyan)' }}>Layer 1</span> Engine - Deterministic. Pure functions on district data.{' '}<br />
            <span style={{ color: 'var(--color-accent-green)' }}>Layer 2</span> Copilot - Explanation. Writes rationale; never invents numbers.{' '}<br />
            <span style={{ color: 'var(--color-accent-purple)' }}>Layer 3</span> Validator - 12 rules; guards every map mutation.
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <div
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold"
        style={{ background: 'rgba(0,184,148,0.10)', color: 'var(--color-accent-green)', border: '1px solid rgba(0,184,148,0.45)' }}
      >
        {n}
      </div>
      <div>
        <div className="font-display text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</div>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{body}</p>
      </div>
    </div>
  )
}
