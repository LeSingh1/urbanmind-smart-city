import { motion } from 'framer-motion'

export function LoadingScreen() {
  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: 'var(--color-bg-app)' }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-subtle) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: 0.18,
        }}
      />

      {/* Top-left light hotspot */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -80,
          left: -80,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
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
          animate={{ filter: ['drop-shadow(0 2px 4px rgba(0,0,0,0.12))', 'drop-shadow(0 4px 8px rgba(0,0,0,0.18))', 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <svg width={64} height={52} viewBox="0 0 64 52" aria-hidden="true">
            <defs>
              <linearGradient id="loading-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ff4757" />
                <stop offset="100%" stopColor="#d63031" />
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
            color: 'var(--color-text-primary)',
            filter: 'drop-shadow(0 1px 0 #ffffff)',
            letterSpacing: '0.18em',
          }}
        >
          UrbanMind
        </h1>
        <p
          className="font-mono text-xs tracking-widest uppercase mb-8"
          style={{ color: 'var(--color-text-muted)', letterSpacing: '0.3em' }}
        >
          AI · City Simulation Engine
        </p>

        {/* Progress bar */}
        <div
          className="w-64 rounded-full overflow-hidden mx-auto mb-4"
          style={{ height: 6, boxShadow: 'var(--shadow-inset)', background: 'var(--color-bg-hover)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, var(--color-accent-cyan), #d63031)',
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
