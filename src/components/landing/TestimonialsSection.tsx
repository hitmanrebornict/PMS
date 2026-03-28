import { motion } from 'motion/react';
import { useLanguage } from '../../i18n/LanguageContext';
import translations from '../../i18n/translations';

export default function TestimonialsSection() {
  const { t } = useLanguage();

  return (
    <section id="testimonials" className="bg-surface-low py-20 md:py-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl mb-10 md:mb-20"
        >
          <h2 className="font-display font-700 text-2xl sm:text-3xl md:text-4xl text-on-surface tracking-tight">
            {t(translations.testimonials.title)}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {translations.testimonials.items.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="bg-surface-lowest rounded-[0.5rem] p-8 md:p-10 flex flex-col justify-between"
              style={{
                boxShadow: '0 10px 30px rgba(48, 51, 47, 0.04), 0 4px 8px rgba(48, 51, 47, 0.02)',
              }}
            >
              <p className="font-body text-sm md:text-base text-on-surface/70 leading-relaxed italic">
                "{t(testimonial.quote)}"
              </p>
              <div className="mt-8">
                <div className="font-display font-600 text-sm text-on-surface">
                  {t(testimonial.name)}
                </div>
                <div className="font-body text-xs text-on-surface/50 mt-1">
                  {t(testimonial.role)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
