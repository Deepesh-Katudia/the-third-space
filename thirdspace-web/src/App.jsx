import Navbar from './components/Navbar'
import Hero from './components/Hero'
import WhySection from './components/WhySection'
import HowItWorks from './components/HowItWorks'
import ForVenues from './components/ForVenues'
import WaitlistForm from './components/WaitlistForm'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="relative bg-cream min-h-screen font-sans">
      {/* Grain texture overlay */}
      <div className="grain-overlay" aria-hidden="true" />

      <Navbar />

      <main>
        <Hero />
        <WhySection />
        <HowItWorks />
        <ForVenues />
        <WaitlistForm />
      </main>

      <Footer />
    </div>
  )
}
