import { motion } from 'motion/react';
import { MessageCircle, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import translations from '../../i18n/translations';

export default function CTASection() {
  const { t } = useLanguage();

  return (
    <section className="bg-primary py-20 md:py-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <h2 className="font-display font-700 text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-on-primary tracking-tight leading-tight">
            {t(translations.cta.title)}
          </h2>
          <p className="mt-6 font-body text-base md:text-lg text-on-primary/70 leading-relaxed max-w-lg">
            {t(translations.cta.subtitle)}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="https://wa.me/601133033319"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-on-primary text-primary px-7 py-3.5 rounded-[0.375rem] font-body font-medium text-base transition-opacity hover:opacity-90"
            >
              <MessageCircle size={18} />
              {t(translations.cta.button)}
            </a>
            <button
              onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 font-body font-medium text-base text-on-primary/80 underline underline-offset-4 decoration-1 hover:text-on-primary transition-colors cursor-pointer"
            >
              {t(translations.nav.contact)}
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
