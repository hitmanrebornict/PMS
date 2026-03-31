import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import translations from '../../i18n/translations';

export default function HeroSection() {
  const { t } = useLanguage();

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center bg-surface overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(101, 93, 79, 0.03) 0%, rgba(237, 225, 207, 0.05) 100%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-10 w-full pt-24 pb-16 sm:pt-32 sm:pb-24 md:pt-40 md:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7"
          >
            <h1 className="font-display font-800 text-3xl sm:text-4xl md:text-6xl lg:text-7xl text-on-surface leading-[1.08] tracking-tight">
              {t(translations.hero.headlineBefore)}
              <span className="text-primary">{t(translations.hero.headlineAccent)}</span>
            </h1>

            <p className="mt-6 sm:mt-8 font-body text-base sm:text-lg md:text-xl text-on-surface/60 max-w-xl leading-relaxed">
              {t(translations.hero.subtitle)}
            </p>

            <div className="mt-8 sm:mt-12 flex flex-wrap items-center gap-4 sm:gap-5">
              <button
                onClick={() => document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2.5 bg-primary text-on-primary px-7 py-3.5 rounded-[0.375rem] font-body font-medium text-base transition-opacity hover:opacity-90 cursor-pointer"
              >
                {t(translations.hero.cta)}
                <ArrowRight size={18} />
              </button>

              <button
                onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
                className="font-body font-medium text-base text-primary underline underline-offset-4 decoration-1 hover:opacity-70 transition-opacity cursor-pointer"
              >
                {t(translations.hero.ctaSecondary)}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5"
          >
            <div className="relative pb-6 lg:pb-0">
              <div
                className="w-full aspect-[16/9] lg:aspect-[4/5] rounded-[0.5rem] overflow-hidden"
                style={{
                  boxShadow: '0 10px 30px rgba(48, 51, 47, 0.04), 0 4px 8px rgba(48, 51, 47, 0.02)',
                }}
              >
                <img
                  src="/hero-apartment.jpg"
                  alt="Modern furnished apartment"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Stats card — shown on desktop only to avoid overflow on mobile */}
              <div
                className="hidden lg:block absolute -bottom-6 -left-6 w-2/3 rounded-[0.5rem] bg-surface-lowest p-6"
                style={{
                  boxShadow: '0 10px 30px rgba(48, 51, 47, 0.04), 0 4px 8px rgba(48, 51, 47, 0.02)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                    <span className="text-primary text-lg">✓</span>
                  </div>
                  <div>
                    <div className="font-display font-600 text-sm text-on-surface">24/7</div>
                    <div className="font-body text-xs text-on-surface/50">Full Service</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {['Rental', 'Furnish', 'Clean', 'Maintain'].map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-full bg-surface-low font-body text-xs text-on-surface/60">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mobile trust badges — shown below image on small screens */}
              <div className="lg:hidden mt-4 grid grid-cols-3 gap-3">
                {[
                  { value: '100+', label: 'Properties' },
                  { value: '24/7', label: 'Support' },
                  { value: '4.9★', label: 'Rating' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-surface-lowest rounded-[0.5rem] py-3 px-2 text-center"
                    style={{ boxShadow: '0 4px 12px rgba(48, 51, 47, 0.04)' }}
                  >
                    <div className="font-display font-700 text-base text-primary">{stat.value}</div>
                    <div className="font-body text-xs text-on-surface/50 mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
