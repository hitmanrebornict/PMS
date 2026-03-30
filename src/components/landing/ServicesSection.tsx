import { motion } from 'motion/react';
import { Home, Sofa, Sparkles, Wrench } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import translations from '../../i18n/translations';

const serviceKeys = [
  {
    key: 'rental' as const,
    icon: Home,
    img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&h=300&fit=crop&q=80',
  },
  {
    key: 'furnishing' as const,
    icon: Sofa,
    img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=300&fit=crop&q=80',
  },
  {
    key: 'cleaning' as const,
    icon: Sparkles,
    img: '/cleaning.png',
  },
  {
    key: 'maintenance' as const,
    icon: Wrench,
    img: '/maintenance.png',
  },
] as const;

export default function ServicesSection() {
  const { t } = useLanguage();

  return (
    <section id="services" className="bg-surface-low py-20 md:py-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mb-10 md:mb-20"
        >
          <h2 className="font-display font-700 text-2xl sm:text-3xl md:text-4xl text-on-surface tracking-tight">
            {t(translations.services.sectionTitle)}
          </h2>
          <p className="mt-5 font-body text-base md:text-lg text-on-surface/60 leading-relaxed">
            {t(translations.services.sectionSubtitle)}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {serviceKeys.map((service, index) => {
            const data = translations.services[service.key];
            return (
              <motion.div
                key={service.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="bg-surface-lowest rounded-[0.5rem] overflow-hidden transition-shadow group"
                style={{
                  boxShadow: '0 10px 30px rgba(48, 51, 47, 0.04), 0 4px 8px rgba(48, 51, 47, 0.02)',
                }}
              >
                <div className="w-full h-48 overflow-hidden">
                  <img
                    src={service.img}
                    alt={t(data.title)}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="p-8 md:p-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-[0.375rem] bg-primary-container/50 flex items-center justify-center">
                      <service.icon size={20} className="text-primary" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-display font-600 text-lg md:text-xl text-on-surface">
                      {t(data.title)}
                    </h3>
                  </div>

                  <p className="font-body text-sm md:text-base text-on-surface/60 leading-relaxed">
                    {t(data.description)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
