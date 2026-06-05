import { motion } from 'framer-motion'
import { useScrollShadow } from '../hooks/useScrollShadow'

export default function Navbar() {
  const hasShadow = useScrollShadow()

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-40 backdrop-blur-md bg-cream/80 transition-shadow duration-300 ${
        hasShadow ? 'shadow-sm' : ''
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2.5 focus:outline-none"
        >
          <div className="w-8 h-8 rounded-full bg-terracotta flex items-center justify-center flex-shrink-0">
            <span className="text-white font-serif font-bold text-sm leading-none">T</span>
          </div>
          <span className="font-serif text-deep-brown text-lg tracking-tight leading-none">
            The Third Space
          </span>
        </button>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'Why', id: 'why' },
            { label: 'How It Works', id: 'how-it-works' },
            { label: 'For Venues', id: 'venues' },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="text-warm-gray hover:text-deep-brown text-sm font-sans transition-colors duration-200 focus:outline-none"
            >
              {label}
            </button>
          ))}
        </nav>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => scrollTo('waitlist')}
          className="text-white text-sm font-medium px-5 py-2.5 rounded-pill focus:outline-none"
          style={{ background: 'linear-gradient(135deg, #C4614A, #E8855F)' }}
        >
          Join Waitlist
        </motion.button>
      </div>
    </motion.header>
  )
}
