import { motion } from 'motion/react';
import { useLanguage } from '../../i18n/LanguageContext';
import translations from '../../i18n/translations';

export default function AboutSection() {
  const { t } = useLanguage();
  const stats = translations.about.stats;

  return (
    <section id="about" className="bg-surface py-20 md:py-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5"
          >
            <div className="relative">
              <div
                className="w-full aspect-[4/3] sm:aspect-[3/4] rounded-[0.5rem] overflow-hidden"
                style={{
                  boxShadow: '0 10px 30px rgba(48, 51, 47, 0.04), 0 4px 8px rgba(48, 51, 47, 0.02)',
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=667&fit=crop&q=80"
                  alt="Clean organized living space"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Overlapping image — hidden on small mobile, visible from sm up */}
              <div
                className="hidden sm:block absolute top-8 -right-4 md:top-12 md:-right-8 w-2/3 aspect-[4/3] rounded-[0.5rem] overflow-hidden"
                style={{
                  boxShadow: '0 10px 30px rgba(48, 51, 47, 0.06), 0 4px 8px rgba(48, 51, 47, 0.03)',
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop&q=80"
                  alt="Beautifully furnished room"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7"
          >
            <h2 className="font-display font-700 text-2xl sm:text-3xl md:text-4xl text-on-surface tracking-tight">
              {t(translations.about.title)}
            </h2>
            <p className="mt-2 font-display font-500 text-base sm:text-lg text-primary/70">
              {t(translations.about.subtitle)}
            </p>

            <div className="mt-6 sm:mt-8 space-y-4 font-body text-sm sm:text-base md:text-lg text-on-surface/60 leading-relaxed">
              <p>{t(translations.about.p1)}</p>
              <p>{t(translations.about.p2)}</p>
            </div>

            <div className="mt-8 sm:mt-10 flex items-center gap-6 sm:gap-12">
              {Object.values(stats).map((stat) => (
                <div key={stat.value}>
                  <div className="font-display font-700 text-xl sm:text-2xl md:text-3xl text-on-surface">
                    {stat.value}
                  </div>
                  <div className="mt-1 font-body text-xs sm:text-sm text-on-surface/50">
                    {t(stat.label)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
