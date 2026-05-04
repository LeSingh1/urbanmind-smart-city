import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Globe, Plus } from 'lucide-react'
import { useCityStore } from '@/stores/cityStore'
import type { CityProfile } from '@/types/city.types'
import { SandboxBuilder } from './SandboxBuilder'

interface Props {
  onEnter: () => void
}

export function LandingScreen({ onEnter }: Props) {
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [sandboxOpen, setSandboxOpen] = useState(false)

  return (
    <div className="relative h-screen overflow-hidden" style={{ background: 'var(--color-bg-app)' }}>
      <StarField />
      <HudGrid />

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          className="w-full max-w-lg"
        >
          {/* Hero panel */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }}
            className="scanline relative rounded-2xl p-10 text-center"
            style={{
              background: 'rgba(13, 26, 46, 0.82)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              boxShadow: '0 0 40px rgba(0,212,255,0.08), 0 0 80px rgba(0,212,255,0.04), inset 0 1px 0 rgba(0,212,255,0.15)',
            }}
          >
            {/* Corner accents */}
            <CornerAccents />

            {/* Logo */}
            <motion.div
              variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } } }}
              className="mb-3"
            >
              <CityIcon />
            </motion.div>

            <motion.h1
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
              className="font-display font-bold tracking-widest uppercase mb-1"
              style={{
                fontSize: 42,
                background: 'linear-gradient(135deg, #00D4FF 0%, #7C3AED 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '0.15em',
                lineHeight: 1.1,
              }}
            >
              UrbanMind
            </motion.h1>

            <motion.p
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              className="font-mono text-sm tracking-widest uppercase mb-1"
              style={{ color: 'var(--color-accent-cyan)', opacity: 0.7, letterSpacing: '0.3em' }}
            >
              AI · CITY SIMULATION
            </motion.p>

            <motion.p
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              className="font-display mb-8 mt-4"
              style={{ color: 'var(--color-text-secondary)', fontSize: 15, lineHeight: 1.6 }}
            >
              Plan how real cities evolve over 50 years.<br />
              AI-powered. Data-driven. Year by year.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
              className="flex flex-col gap-3"
            >
              <GlowButton
                variant="cyan"
                onClick={() => setGalleryOpen(true)}
                icon={<Globe size={16} />}
              >
                Explore a Real City
              </GlowButton>
              <GlowButton
                variant="purple"
                onClick={() => setSandboxOpen(true)}
                icon={<Plus size={16} />}
              >
                Build a New City
              </GlowButton>
            </motion.div>

            {/* Status line */}
            <motion.div
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.5 } } }}
              className="mt-6 flex items-center justify-center gap-2"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-glow-pulse" style={{ background: 'var(--color-accent-cyan)' }} />
              <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.2em' }}>
                9 CITIES · 5 SCENARIOS · 50-YEAR HORIZON
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <AnimatePresence>
        {galleryOpen && <CityGallery onClose={() => setGalleryOpen(false)} onEnter={onEnter} />}
        {sandboxOpen && (
          <SandboxOverlay onClose={() => setSandboxOpen(false)} onGenerated={onEnter} />
        )}
      </AnimatePresence>
    </div>
  )
}

function GlowButton({
  children,
  onClick,
  variant,
  icon,
}: {
  children: React.ReactNode
  onClick: () => void
  variant: 'cyan' | 'purple'
  icon?: React.ReactNode
}) {
  const isCyan = variant === 'cyan'
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, boxShadow: isCyan ? '0 0 24px rgba(0,212,255,0.5)' : '0 0 24px rgba(124,58,237,0.5)' }}
      whileTap={{ scale: 0.97 }}
      className="relative w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-display font-semibold text-sm tracking-wide transition-colors"
      style={{
        border: `1px solid ${isCyan ? 'var(--color-accent-cyan)' : 'var(--color-accent-purple)'}`,
        color: isCyan ? 'var(--color-accent-cyan)' : 'var(--color-accent-purple)',
        background: isCyan ? 'rgba(0,212,255,0.06)' : 'rgba(124,58,237,0.06)',
        letterSpacing: '0.06em',
      }}
    >
      {icon}
      {children}
    </motion.button>
  )
}

function CityGallery({ onClose, onEnter }: { onClose: () => void; onEnter: () => void }) {
  const cities = useCityStore((state) => state.cities)
  const selectCity = useCityStore((state) => state.selectCity)

  const chooseCity = (city: CityProfile) => {
    selectCity(city)
    onClose()
    onEnter()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-auto"
      style={{ background: 'rgba(5,10,20,0.92)', backdropFilter: 'blur(16px)' }}
    >
      <button
        onClick={onClose}
        className="fixed top-5 right-5 flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
        style={{ border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)', background: 'var(--color-bg-panel)' }}
        aria-label="Close city gallery"
      >
        <X size={16} />
      </button>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <h2 className="font-display font-bold text-3xl tracking-wide mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Choose Your City
          </h2>
          <p className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
            Select a real city to begin the 50-year simulation
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
          className="grid grid-cols-3 gap-4"
        >
          {cities.map((city) => (
            <CityCard key={city.id} city={city} onSelect={chooseCity} />
          ))}
        </motion.div>
      </div>
    </motion.div>
  )
}

function CityCard({ city, onSelect }: { city: CityProfile; onSelect: (c: CityProfile) => void }) {
  return (
    <motion.button
      variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } }}
      onClick={() => onSelect(city)}
      whileHover={{ scale: 1.02, borderColor: 'rgba(0,212,255,0.5)', boxShadow: '0 0 20px rgba(0,212,255,0.12)' }}
      whileTap={{ scale: 0.98 }}
      className="group text-left rounded-xl overflow-hidden transition-all"
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border-subtle)',
      }}
    >
      {/* City thumbnail / gradient header */}
      <div
        className="relative h-36 flex items-end p-4"
        style={{
          background: `linear-gradient(135deg, ${cityColor(city.id)} 0%, #050A14 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,212,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.06) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <h3
          className="relative font-display font-bold text-xl leading-tight"
          style={{ color: 'var(--color-text-primary)', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
        >
          {city.name}
        </h3>
      </div>

      {/* City info */}
      <div className="p-4">
        <p className="font-mono text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
          {city.country} · {formatPopulation(city.population_current)}
        </p>
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-secondary)', fontSize: 11, lineHeight: 1.5 }}>
          {city.key_planning_challenge}
        </p>
        <div
          className="mt-3 flex items-center gap-1.5 text-xs font-semibold font-mono tracking-wide opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-accent-cyan)' }}
        >
          <span>SIMULATE</span>
          <span>→</span>
        </div>
      </div>
    </motion.button>
  )
}

function SandboxOverlay({ onClose, onGenerated }: { onClose: () => void; onGenerated: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-auto p-8"
      style={{ background: 'rgba(5,10,20,0.92)', backdropFilter: 'blur(16px)' }}
    >
      <button
        onClick={onClose}
        className="fixed top-5 right-5 flex items-center justify-center w-9 h-9 rounded-lg"
        style={{ border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)', background: 'var(--color-bg-panel)' }}
        aria-label="Close sandbox builder"
      >
        <X size={16} />
      </button>
      <SandboxBuilder onGenerated={() => { onClose(); onGenerated() }} />
    </motion.div>
  )
}

export function Logo({ large = false }: { large?: boolean }) {
  return (
    <div className="inline-flex items-center gap-3">
      <span
        className="font-display font-bold tracking-widest uppercase"
        style={{
          fontSize: large ? 32 : 15,
          background: 'linear-gradient(135deg, #00D4FF 0%, #7C3AED 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '0.12em',
        }}
      >
        UrbanMind
      </span>
      {large && (
        <span className="font-mono text-xs tracking-widest" style={{ color: 'var(--color-accent-cyan)', opacity: 0.6 }}>
          AI
        </span>
      )}
    </div>
  )
}

function CityIcon() {
  return (
    <svg width={56} height={44} viewBox="0 0 56 44" aria-hidden="true">
      <defs>
        <linearGradient id="city-icon-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <filter id="city-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path
        d="M4 40V22h7V10h9v30h5V16h8v24h5V4h11v36h4v4H1v-4h3z"
        fill="url(#city-icon-grad)"
        filter="url(#city-glow)"
      />
    </svg>
  )
}

function CornerAccents() {
  const size = 14
  const stroke = 'rgba(0,212,255,0.5)'
  const style: React.CSSProperties = { position: 'absolute', strokeWidth: 1.5, fill: 'none', stroke }
  return (
    <>
      <svg width={size} height={size} style={{ ...style, top: 10, left: 10 }} viewBox="0 0 14 14">
        <path d="M14,2 L2,2 L2,14" />
      </svg>
      <svg width={size} height={size} style={{ ...style, top: 10, right: 10 }} viewBox="0 0 14 14">
        <path d="M0,2 L12,2 L12,14" />
      </svg>
      <svg width={size} height={size} style={{ ...style, bottom: 10, left: 10 }} viewBox="0 0 14 14">
        <path d="M14,12 L2,12 L2,0" />
      </svg>
      <svg width={size} height={size} style={{ ...style, bottom: 10, right: 10 }} viewBox="0 0 14 14">
        <path d="M0,12 L12,12 L12,0" />
      </svg>
    </>
  )
}

function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.2 + 0.2,
      alpha: Math.random() * 0.6 + 0.1,
      speed: Math.random() * 0.003 + 0.001,
      phase: Math.random() * Math.PI * 2,
    }))

    let animId: number
    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 0.01
      for (const s of stars) {
        ctx.globalAlpha = s.alpha * (0.5 + 0.5 * Math.sin(t * s.speed * 100 + s.phase))
        ctx.fillStyle = Math.random() > 0.98 ? '#7C3AED' : '#00D4FF'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0.7 }} />
}

function HudGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none animate-grid-pulse"
      style={{
        backgroundImage:
          'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }}
    />
  )
}

function cityColor(id: string): string {
  const map: Record<string, string> = {
    new_york: '#1a2a4a',
    los_angeles: '#2a1a0a',
    tokyo: '#0a1a2a',
    lagos: '#1a2a0a',
    london: '#0a1a1a',
    sao_paulo: '#1a0a2a',
    singapore: '#0a2a1a',
    dubai: '#2a1a0a',
    mumbai: '#1a1a0a',
  }
  return map[id] ?? '#0F2035'
}

function formatPopulation(value: number) {
  return `${(value / 1_000_000).toFixed(value > 10_000_000 ? 1 : 2)}M`
}
