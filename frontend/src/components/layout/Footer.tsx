import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-slate-navy py-6 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
        <p className="text-sm text-white/70">
          {t('brand.copyright', { year: new Date().getFullYear() })}
        </p>
        <Link
          to="/privacy"
          className="text-sm text-white/70 transition-colors hover:text-white"
        >
          {t('brand.privacyPolicy')}
        </Link>
      </div>
    </footer>
  );
}
