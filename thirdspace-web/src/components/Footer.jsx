import { motion } from 'framer-motion'

const links = [
  { label: 'Instagram', href: '#' },
  { label: 'TikTok', href: '#' },
  { label: 'Contact', href: 'mailto:macusamantha@gmail.com' },
  { label: 'For Venues', href: '#venues', isAnchor: true },
]

export default function Footer() {
  const scrollToVenues = () =>
    document.getElementById('venues')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <footer className="bg-deep-brown py-12 px-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">

          {/* Logo + tagline */}
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-full bg-terracotta flex items-center justify-center flex-shrink-0">
                <span className="text-white font-serif font-bold text-xs leading-none">T</span>
              </div>
              <span className="font-serif text-warm-white text-base tracking-tight">
                The Third Space
              </span>
            </div>
            <p className="font-sans font-light text-[13px]" style={{ color: '#A89080' }}>
              Brooklyn & Manhattan · Launching 2026 · Founded by Samantha Aleman
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {links.map(({ label, href, isAnchor }) =>
              isAnchor ? (
                <button
                  key={label}
                  onClick={scrollToVenues}
                  className="font-sans text-sm transition-colors duration-200 focus:outline-none"
                  style={{ color: '#A89080' }}
                  onMouseEnter={(e) => (e.target.style.color = '#F2C5A0')}
                  onMouseLeave={(e) => (e.target.style.color = '#A89080')}
                >
                  {label}
                </button>
              ) : (
                <a
                  key={label}
                  href={href}
                  className="font-sans text-sm transition-colors duration-200"
                  style={{ color: '#A89080' }}
                  onMouseEnter={(e) => (e.target.style.color = '#F2C5A0')}
                  onMouseLeave={(e) => (e.target.style.color = '#A89080')}
                >
                  {label}
                </a>
              )
            )}
          </nav>
        </div>

        {/* Divider */}
        <div className="border-t mb-6" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

        {/* Copyright */}
        <p className="font-sans text-[12px]" style={{ color: '#7A6055' }}>
          © 2026 Your Third Space LLC · All rights reserved · NYC
        </p>
      </div>
    </footer>
  )
}
