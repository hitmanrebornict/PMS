import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import translations from '../../i18n/translations';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-on-surface py-12 sm:py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="VersaHome" className="h-8 w-auto" />
              <span className="font-display font-700 text-xl text-surface tracking-tight">
                VersaHome
              </span>
              <span className="font-body text-xs text-surface/40 ml-2">
                202601004828 (1666926-V)
              </span>
            </div>
            <p className="mt-2 font-body text-sm text-surface/50 max-w-sm">
              {t(translations.footer.tagline)}
            </p>
          </div>

          <div className="flex items-center gap-8">
            <a
              href="#services"
              className="font-body text-sm text-surface/50 hover:text-surface/80 transition-colors"
            >
              {t(translations.nav.services)}
            </a>
            <a
              href="#about"
              className="font-body text-sm text-surface/50 hover:text-surface/80 transition-colors"
            >
              {t(translations.nav.about)}
            </a>
            <Link
              to="/manage"
              className="font-body text-sm text-surface/50 hover:text-surface/80 transition-colors"
            >
              {t(translations.cta.manage)}
            </Link>
          </div>
        </div>

        <div
          className="mt-12 pt-8 font-body text-xs text-surface/30"
          style={{ borderTop: '1px solid rgba(251, 249, 246, 0.08)' }}
        >
          &copy; {new Date().getFullYear()} Versa Home Sdn Bhd 202601004828 (1666926-V). {t(translations.footer.copyright)}.
        </div>
      </div>
    </footer>
  );
}
