import { motion } from 'framer-motion'

export function LoadingScreen() {
  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: 'var(--color-bg-app)' }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* HUD grid background */}
      <div
        className="absolute inset-0 animate-grid-pulse"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Scan line */}
      <div
        className="absolute left-0 right-0 h-px pointer-events-none animate-scan-down"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)',
          top: 0,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative text-center z-10"
      >
        {/* City icon */}
        <motion.div
          className="flex justify-center mb-6"
          animate={{ filter: ['drop-shadow(0 0 8px rgba(0,212,255,0.4))', 'drop-shadow(0 0 24px rgba(0,212,255,0.8))', 'drop-shadow(0 0 8px rgba(0,212,255,0.4))'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <svg width={64} height={52} viewBox="0 0 64 52" aria-hidden="true">
            <defs>
              <linearGradient id="loading-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00D4FF" />
                <stop offset="100%" stopColor="#7C3AED" />
              </linearGradient>
            </defs>
            <path d="M4 48V26h8V12h10v36h6V20h9v28h5V6h12v42h4v4H2v-4h2z" fill="url(#loading-grad)" />
          </svg>
        </motion.div>

        {/* Title */}
        <h1
          className="font-display font-bold tracking-widest uppercase mb-1"
          style={{
            fontSize: 36,
            background: 'linear-gradient(135deg, #00D4FF 0%, #7C3AED 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.18em',
          }}
        >
          UrbanMind
        </h1>
        <p
          className="font-mono text-xs tracking-widest uppercase mb-8"
          style={{ color: 'var(--color-accent-cyan)', opacity: 0.6, letterSpacing: '0.3em' }}
        >
          AI · City Simulation Engine
        </p>

        {/* Progress bar */}
        <div
          className="w-64 h-0.5 rounded-full overflow-hidden mx-auto mb-4"
          style={{ background: 'rgba(0,212,255,0.1)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, var(--color-accent-cyan), var(--color-accent-purple))',
              boxShadow: '0 0 8px rgba(0,212,255,0.6)',
            }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
          />
        </div>

        {/* Status text */}
        <motion.p
          className="font-mono text-xs tracking-widest"
          style={{ color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          INITIALIZING SIMULATION ENGINE…
        </motion.p>
      </motion.div>
    </motion.div>
  )
}
