import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Globe } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import translations from '../../i18n/translations';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, setLang, t } = useLanguage();

  const navLinks = [
    { label: t(translations.nav.home), href: '#home' },
    { label: t(translations.nav.services), href: '#services' },
    { label: t(translations.nav.about), href: '#about' },
    { label: t(translations.nav.testimonials), href: '#testimonials' },
    { label: t(translations.nav.contact), href: '#contact' },
  ];

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleLang = () => setLang(lang === 'zh' ? 'en' : 'zh');

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 font-body"
      style={{
        backgroundColor: 'rgba(251, 249, 246, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 10px 30px rgba(48, 51, 47, 0.04), 0 4px 8px rgba(48, 51, 47, 0.02)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 flex items-center justify-between h-16 md:h-20">
        {/* Logo + Brand */}
        <a
          href="#home"
          onClick={() => scrollTo('#home')}
          className="flex items-center gap-2 shrink-0"
        >
          <img
            src="/logo.png"
            alt="VersaHome"
            className="h-9 md:h-10 w-auto"
          />
          <span className="font-display font-700 text-lg md:text-2xl text-on-surface tracking-tight">
            VersaHome
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-7">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-sm font-medium text-on-surface/70 hover:text-on-surface transition-colors cursor-pointer whitespace-nowrap"
            >
              {link.label}
            </button>
          ))}

          {/* Language toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 text-sm font-medium text-on-surface/70 hover:text-on-surface transition-colors cursor-pointer"
          >
            <Globe size={16} />
            {lang === 'zh' ? 'EN' : '中文'}
          </button>

          <Link
            to="/login"
            className="bg-primary text-on-primary px-5 py-2.5 rounded-[0.375rem] text-sm font-medium transition-opacity hover:opacity-90 cursor-pointer whitespace-nowrap"
          >
            {t(translations.cta.manage)}
          </Link>
        </div>

        {/* Mobile controls */}
        <div className="flex lg:hidden items-center gap-3">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 text-sm font-medium text-on-surface/70 cursor-pointer"
          >
            <Globe size={16} />
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-on-surface cursor-pointer"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden overflow-hidden bg-surface"
          >
            <div className="px-6 pb-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="text-left text-sm font-medium text-on-surface/70 hover:text-on-surface transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
              <Link
                to="/login"
                className="bg-primary text-on-primary px-5 py-2.5 rounded-[0.375rem] text-sm font-medium text-center transition-opacity hover:opacity-90"
              >
                {t(translations.cta.manage)}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
