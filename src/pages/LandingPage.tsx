import { LanguageProvider } from '../i18n/LanguageContext';
import FloatingContact from '../components/landing/FloatingContact';
import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';
import ServicesSection from '../components/landing/ServicesSection';
import AboutSection from '../components/landing/AboutSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import CTASection from '../components/landing/CTASection';
import ContactSection from '../components/landing/ContactSection';
import Footer from '../components/landing/Footer';

export default function LandingPage() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-surface text-on-surface font-body">
        <Navbar />
        <HeroSection />
        <ServicesSection />
        <AboutSection />
        <TestimonialsSection />
        <CTASection />
        <ContactSection />
        <Footer />
        <FloatingContact />
      </div>
    </LanguageProvider>
  );
}
