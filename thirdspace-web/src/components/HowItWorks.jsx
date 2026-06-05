import { motion } from 'framer-motion'

const steps = [
  {
    number: '01',
    icon: '🛡️',
    title: 'Create your verified profile',
    body: 'Submit a verified photo and ID. Add your interests, neighborhood, and bio. No anonymous accounts — ever. This is what makes everyone on the platform real.',
    accent: '#C4614A',
  },
  {
    number: '02',
    icon: '📍',
    title: 'Find events with your people',
    body: 'Browse interest-based events near you — ceramics nights, rooftop socials, book clubs, pickup basketball. See who else is going before you even register.',
    accent: '#7A8C6E',
  },
  {
    number: '03',
    icon: '💬',
    title: 'Connect before, during & after',
    body: 'Message attendees before the event. Join group chats. Arrive already knowing someone. And if you met someone but forgot to get their contact — the attendee list stays open forever.',
    accent: '#A0673A',
  },
]

const pills = [
  "🛡️ ID verified profiles",
  "👥 See who's going first",
  "💬 Pre-event messaging",
  "🏆 Points & rewards",
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-cream py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-6">

        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="section-label">How It Works</span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-deep-brown mb-14 leading-tight"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', letterSpacing: '-0.04em' }}
        >
          Built{' '}
          <em style={{ color: '#C4614A', fontStyle: 'italic' }}>different.</em>{' '}
          Actually works.
        </motion.h2>

        {/* Step cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12"
        >
          {steps.map(({ number, icon, title, body, accent }) => (
            <motion.div
              key={number}
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
              }}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="rounded-card p-6 bg-warm-white"
              style={{ boxShadow: '0 2px 20px rgba(44,24,16,0.06)' }}
            >
              {/* Step label */}
              <p
                className="font-sans text-[11px] tracking-[0.08em] uppercase font-medium mb-4"
                style={{ color: accent }}
              >
                Step {number}
              </p>
              {/* Icon circle */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg mb-4"
                style={{ background: `${accent}22` }}
              >
                {icon}
              </div>
              {/* Title */}
              <h3
                className="font-serif text-deep-brown mb-3 leading-tight"
                style={{ fontSize: '1.25rem', letterSpacing: '-0.02em' }}
              >
                {title}
              </h3>
              {/* Body */}
              <p className="font-sans font-light text-warm-gray text-sm leading-relaxed">
                {body}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          className="flex flex-wrap gap-3 justify-center"
        >
          {pills.map((pill) => (
            <motion.span
              key={pill}
              variants={{
                hidden: { opacity: 0, scale: 0.92 },
                visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
              }}
              className="font-sans text-sm font-medium px-4 py-2 rounded-pill"
              style={{ background: 'rgba(196,97,74,0.08)', color: '#6B3F2A' }}
            >
              {pill}
            </motion.span>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
