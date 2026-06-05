import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'

const checklist = [
  'ID-verified profiles',
  'Interest-based events',
  "See who's going first",
  'Pre-event messaging',
  'Real group chats',
  'Points & rewards',
]

export default function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')

  const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setErrorMsg('')
    try {
      await addDoc(collection(db, 'waitlist'), {
        email: email.trim().toLowerCase(),
        timestamp: serverTimestamp(),
        source: 'marketing-site',
      })
      setStatus('success')
    } catch (err) {
      setErrorMsg('Something went wrong. Try again.')
      setStatus('error')
    }
  }

  return (
    <section id="waitlist" className="bg-deep-brown py-24 md:py-32 relative overflow-hidden">
      {/* Decorative blob */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-60px',
          right: '-80px',
          width: 360,
          height: 360,
          background: '#F2C5A0',
          borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%',
          filter: 'blur(80px)',
          opacity: 0.08,
        }}
      />

      <div className="max-w-3xl mx-auto px-6 relative">

        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span
            className="inline-block text-[11px] tracking-[0.08em] uppercase font-medium px-3 py-1 rounded-pill mb-5"
            style={{ color: '#C4614A', background: 'rgba(196,97,74,0.15)' }}
          >
            Join the Waitlist
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-warm-white mb-5 leading-tight"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3rem)', letterSpacing: '-0.04em' }}
        >
          Be the first.{' '}
          <em style={{ color: '#F2C5A0', fontStyle: 'italic' }}>Your city is waiting.</em>
        </motion.h2>

        {/* Body */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-sans font-light leading-relaxed mb-10"
          style={{ color: '#A89080', fontSize: '1.05rem' }}
        >
          The app launches in Brooklyn and Manhattan. Join the waitlist and get early access,
          founding member perks, and first pick of launch events.
        </motion.p>

        {/* Form / Success */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mb-4"
        >
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="rounded-card p-6 text-center"
                style={{ background: 'rgba(242,197,160,0.12)' }}
              >
                <p className="text-3xl mb-2">🎉</p>
                <p className="font-serif text-warm-white text-xl mb-1">You're on the list!</p>
                <p className="font-sans font-light text-sm" style={{ color: '#A89080' }}>
                  We'll reach out with early access, launch events, and founding member perks.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                className="flex flex-col md:flex-row gap-3"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setStatus('idle')
                    setErrorMsg('')
                  }}
                  placeholder="your@email.com"
                  required
                  className="flex-1 rounded-pill px-5 py-3.5 font-sans text-[15px] text-deep-brown placeholder-warm-gray/60 outline-none focus:ring-2 focus:ring-terracotta/40"
                  style={{ background: 'rgba(255,255,255,0.92)', border: 'none' }}
                />
                <motion.button
                  type="submit"
                  disabled={status === 'loading'}
                  whileHover={status !== 'loading' ? { scale: 1.02 } : {}}
                  whileTap={status !== 'loading' ? { scale: 0.98 } : {}}
                  className="text-white font-medium px-7 py-3.5 rounded-pill text-[15px] flex-shrink-0 disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #C4614A, #E8855F)' }}
                >
                  {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Error message */}
          {status === 'error' && errorMsg && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-sans text-sm mt-3 pl-1"
              style={{ color: '#E8855F' }}
            >
              {errorMsg}
            </motion.p>
          )}

          {/* Micro-copy */}
          {status !== 'success' && (
            <p className="font-sans text-[12px] mt-3 pl-1" style={{ color: '#7A6055' }}>
              No spam. No selling your email. Just launch updates and event invites.
            </p>
          )}
        </motion.div>

        {/* Feature checklist */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 gap-x-8 gap-y-2 mt-8"
        >
          {checklist.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <span className="text-terracotta font-bold text-sm flex-shrink-0">✓</span>
              <span className="font-sans font-light text-sm" style={{ color: '#A89080' }}>{item}</span>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
