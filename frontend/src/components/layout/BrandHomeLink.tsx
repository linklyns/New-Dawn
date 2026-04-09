import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import favicon from '../../assets/favicon.png';

type BrandHomeLinkProps = {
  to: string;
};

export function BrandHomeLink({ to }: BrandHomeLinkProps) {
  const { t } = useTranslation();

  return (
    <Link to={to} className="flex items-center gap-2 py-1 transition-opacity hover:opacity-80">
      <img src={favicon} alt={t('brand.newDawn')} className="h-20 w-20 object-contain" />
      <span className="font-heading text-xl font-bold leading-tight text-slate-navy dark:text-white">
        {t('brand.newDawn')}
      </span>
    </Link>
  );
}