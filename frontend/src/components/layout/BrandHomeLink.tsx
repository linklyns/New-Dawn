import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import newDawnLogo from '../../assets/newdawnlogo.png';

type BrandHomeLinkProps = {
  to: string;
};

export function BrandHomeLink({ to }: BrandHomeLinkProps) {
  const { t } = useTranslation();

  return (
    <Link to={to} className="flex items-center gap-2 py-1 transition-opacity hover:opacity-80">
      <img src={newDawnLogo} alt={t('brand.newDawn')} className="h-12 w-auto object-contain sm:h-14" />
      <span className="font-heading text-xl font-bold leading-tight text-slate-navy dark:text-white">
        {t('brand.newDawn')}
      </span>
    </Link>
  );
}