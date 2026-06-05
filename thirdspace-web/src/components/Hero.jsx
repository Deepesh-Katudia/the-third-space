import { motion } from 'framer-motion'

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
}

function EventCard({ emoji, name, venue, tag, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-white rounded-xl p-2.5 mb-2 shadow-sm"
    >
      <div className="flex items-start justify-between mb-1.5">
        <div>
          <p className="text-deep-brown font-sans font-medium text-[11px] leading-tight">
            {emoji} {name}
          </p>
          <p className="text-warm-gray font-sans text-[9px] mt-0.5">{venue}</p>
        </div>
        <span
          className="text-[8px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ background: 'rgba(196,97,74,0.12)', color: '#C4614A' }}
        >
          {tag}
        </span>
      </div>
      {/* Blurred profile circles */}
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-5 h-5 rounded-full flex-shrink-0"
            style={{
              background: ['#F2C5A0', '#C4614A', '#7A8C6E'][i],
              filter: 'blur(2px)',
              opacity: 0.7,
            }}
          />
        ))}
        <span className="text-warm-gray font-sans text-[8px] ml-1 self-center">+4 going</span>
      </div>
    </motion.div>
  )
}

function PhoneMockup() {
  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      className="relative mx-auto"
      style={{ width: 220, height: 440 }}
    >
      {/* Phone shell */}
      <div
        className="absolute inset-0 rounded-[28px] shadow-2xl"
        style={{
          background: 'linear-gradient(145deg, #3a1e12, #2C1810)',
          padding: '12px 10px',
        }}
      >
        {/* Notch */}
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black"
          style={{ width: 60, height: 10 }}
        />
        {/* Screen */}
        <div
          className="h-full rounded-[20px] overflow-hidden"
          style={{ background: '#FBF7F2', paddingTop: 20 }}
        >
          {/* App header bar */}
          <div className="px-3 py-2 flex items-center justify-between border-b border-blush/30">
            <span className="font-serif text-deep-brown text-[11px] font-bold">Nearby</span>
            <div className="w-5 h-5 rounded-full bg-terracotta/20 flex items-center justify-center">
              <span className="text-[8px]">🔍</span>
            </div>
          </div>
          {/* Event cards */}
          <div className="p-2 overflow-hidden">
            <EventCard emoji="🏺" name="Ceramics Night" venue="Brooklyn Clay Studio" tag="Arts" delay={0.2} />
            <EventCard emoji="🌆" name="Rooftop Social" venue="The Skyloft" tag="Social" delay={0.35} />
            <EventCard emoji="📚" name="Book Club" venue="Greenlight Books" tag="Lit" delay={0.5} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function Hero() {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-cream pt-24 pb-20 md:pt-32 md:pb-28"
    >
      {/* Decorative blobs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-80px',
          right: '-60px',
          width: 400,
          height: 400,
          background: '#F2C5A0',
          borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%',
          filter: 'blur(72px)',
          opacity: 0.18,
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-40px',
          left: '-80px',
          width: 320,
          height: 320,
          background: '#E8855F',
          borderRadius: '40% 60% 30% 70% / 60% 40% 70% 30%',
          filter: 'blur(80px)',
          opacity: 0.14,
        }}
      />

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-8 items-center">
          {/* Text content */}
          <div>
            {/* Section label */}
            <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
              <span className="section-label">NYC Community App</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="font-serif text-deep-brown mt-3 mb-5 leading-tight"
              style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', letterSpacing: '-0.04em' }}
            >
              Find your people.{' '}
              <em className="not-italic" style={{ color: '#C4614A', fontStyle: 'italic' }}>
                In real life.
              </em>{' '}
              In NYC.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-warm-gray font-sans font-light leading-relaxed mb-8"
              style={{ fontSize: '1.05rem', maxWidth: 500 }}
            >
              The Third Space connects New Yorkers through real, interest-based gatherings at local
              venues — with verified profiles and genuine community, not swiping.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap gap-3 mb-10"
            >
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(196,97,74,0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => scrollTo('waitlist')}
                className="text-white font-medium px-7 py-3.5 rounded-pill text-[15px]"
                style={{ background: 'linear-gradient(135deg, #C4614A, #E8855F)' }}
              >
                Join the Waitlist
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => scrollTo('how-it-works')}
                className="text-terracotta font-medium px-7 py-3.5 rounded-pill text-[15px] border border-terracotta/40 hover:border-terracotta transition-colors"
              >
                How it works →
              </motion.button>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap gap-6"
            >
              {[
                { stat: '1K+', label: 'Early signups' },
                { stat: '20+', label: 'Venue partners' },
                { stat: '5', label: 'NYC boroughs' },
              ].map(({ stat, label }) => (
                <div key={label}>
                  <p className="font-serif text-deep-brown text-xl font-bold leading-tight">{stat}</p>
                  <p className="text-warm-gray font-sans text-[13px]">{label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Phone mockup */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center md:justify-end"
          >
            <PhoneMockup />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
