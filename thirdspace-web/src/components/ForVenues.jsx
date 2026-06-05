import { motion } from 'framer-motion'

const benefits = [
  {
    icon: '🎁',
    title: 'First 2 events free',
    desc: 'List your first two events at zero cost. No credit card, no commitment.',
  },
  {
    icon: '📊',
    title: 'Real analytics',
    desc: "Registration count, attendance rate, repeat visitors. Know exactly what's working.",
  },
  {
    icon: '📢',
    title: 'Direct announcement channel',
    desc: "Message all registered attendees directly — 'Bring scissors!' or 'Event moved to back room.'",
  },
  {
    icon: '💰',
    title: 'Monthly listing from $50',
    desc: 'Flat monthly fee. You keep 75–85% of ticket revenue.',
  },
]

export default function ForVenues() {
  return (
    <section
      id="venues"
      className="py-24 md:py-32 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #F5EDE4 0%, #EDD9C8 100%)' }}
    >
      <div className="max-w-5xl mx-auto px-6">

        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="section-label">For Venue Partners</span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-deep-brown mb-6 leading-tight"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', letterSpacing: '-0.04em', maxWidth: 640 }}
        >
          Fill your space.{' '}
          <em style={{ color: '#6B3F2A', fontStyle: 'italic' }}>Build your community.</em>
        </motion.h2>

        {/* Body */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-warm-gray font-sans font-light leading-relaxed mb-12"
          style={{ fontSize: '1.05rem', maxWidth: 560 }}
        >
          The Third Space brings registered, engaged, interest-matched New Yorkers directly through
          your door — not random Instagram followers. Every attendee is ID-verified and genuinely
          interested in what you're offering.
        </motion.p>

        {/* Benefit cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12"
        >
          {benefits.map(({ icon, title, desc }) => (
            <motion.div
              key={title}
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
              }}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="bg-warm-white rounded-card p-6"
              style={{ boxShadow: '0 2px 16px rgba(107,63,42,0.08)' }}
            >
              <span className="text-2xl mb-3 block">{icon}</span>
              <h3
                className="font-serif text-deep-brown mb-2 leading-tight"
                style={{ fontSize: '1.15rem', letterSpacing: '-0.02em' }}
              >
                {title}
              </h3>
              <p className="font-sans font-light text-warm-gray text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.a
            href="mailto:macusamantha@gmail.com?subject=Venue Partner Inquiry"
            whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(196,97,74,0.3)' }}
            whileTap={{ scale: 0.98 }}
            className="inline-block text-white font-medium px-8 py-3.5 rounded-pill text-[15px]"
            style={{ background: 'linear-gradient(135deg, #C4614A, #E8855F)' }}
          >
            Partner with us →
          </motion.a>
        </motion.div>

      </div>
    </section>
  )
}
