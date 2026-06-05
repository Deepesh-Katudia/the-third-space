import { motion } from 'framer-motion'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
})

const stats = [
  { stat: '58%', desc: 'of NYC adults report feeling lonely', source: 'U.S. Surgeon General, 2023' },
  { stat: '#1', desc: 'NYC is the loneliest major US city', source: 'Cigna Loneliness Index' },
  { stat: '3 in 4', desc: 'Gen Z & Millennials burned out on dating apps', source: 'Bumble research' },
]

const failApps = [
  { name: 'Meetup', reason: 'No real profiles. You show up and leave as a stranger.' },
  { name: 'Bumble BFF', reason: "Nobody takes it seriously. Too close to dating app roots." },
  { name: 'Eventbrite', reason: 'Pure ticketing. Zero social layer. Zero community.' },
  { name: 'Timeleft', reason: '50%+ no-show rate. No profiles. No way to reconnect.' },
]

export default function WhySection() {
  return (
    <section id="why" className="bg-deep-brown py-24 md:py-32 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-6">

        {/* Section label */}
        <motion.div {...fadeUp(0)}>
          <span
            className="inline-block text-[11px] tracking-[0.08em] uppercase font-medium px-3 py-1 rounded-pill mb-5"
            style={{ color: '#C4614A', background: 'rgba(196,97,74,0.15)' }}
          >
            The Problem
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          {...fadeUp(0.05)}
          className="font-serif text-warm-white mb-6 leading-tight"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', letterSpacing: '-0.04em', maxWidth: 700 }}
        >
          NYC has 8 million people.{' '}
          <em style={{ color: '#F2C5A0', fontStyle: 'italic' }}>You're still eating alone.</em>
        </motion.h2>

        {/* Body */}
        <motion.p
          {...fadeUp(0.1)}
          className="font-sans font-light leading-relaxed mb-14"
          style={{ color: '#A89080', fontSize: '1.05rem', maxWidth: 580 }}
        >
          The U.S. Surgeon General declared loneliness a public health epidemic. And nowhere is the
          irony more painful than New York City — the most densely populated place in America, and
          one of the loneliest.
        </motion.p>

        {/* Stats */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16"
        >
          {stats.map(({ stat, desc, source }) => (
            <motion.div
              key={stat}
              variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }}
              className="rounded-card p-6"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <p className="font-serif text-blush mb-2 leading-none" style={{ fontSize: '2.4rem', letterSpacing: '-0.04em' }}>{stat}</p>
              <p className="font-sans font-light text-sm mb-2 leading-relaxed" style={{ color: '#C8B4A8' }}>{desc}</p>
              <p className="font-sans text-[11px]" style={{ color: '#7A6055' }}>{source}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Why apps fail */}
        <motion.div {...fadeUp(0.15)}>
          <p
            className="font-sans text-[11px] tracking-[0.08em] uppercase mb-5"
            style={{ color: '#7A6055' }}
          >
            Why existing apps fail
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {failApps.map(({ name, reason }) => (
              <div key={name} className="flex gap-3">
                <span className="font-sans font-medium flex-shrink-0" style={{ color: '#E8855F' }}>✕</span>
                <p className="font-sans font-light text-sm leading-relaxed" style={{ color: '#A89080' }}>
                  <span className="font-medium" style={{ color: '#C8B4A8' }}>{name}</span>
                  {' '}— {reason}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  )
}
