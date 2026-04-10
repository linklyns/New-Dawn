import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Heart, Sparkles, GraduationCap } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { api } from '../../lib/api';

interface PublicStats {
  girlsServed: number;
  safehouses: number;
  donations: number;
  partners: number;
}

export function LandingPage() {
  const { t } = useTranslation();
  const { data: liveStats } = useQuery<PublicStats>({
    queryKey: ['public-stats'],
    queryFn: () => api.get('/api/public-impact/stats'),
  });

  const pillars = [
    {
      icon: Heart,
      title: t('landing.caring'),
      description: t('landing.caringDesc'),
    },
    {
      icon: Sparkles,
      title: t('landing.healing'),
      description: t('landing.healingDesc'),
    },
    {
      icon: GraduationCap,
      title: t('landing.teaching'),
      description: t('landing.teachingDesc'),
    },
  ];

  const stats = [
    { value: liveStats ? `${liveStats.girlsServed}+` : '--', label: t('landing.girlsServed') },
    { value: liveStats ? `${liveStats.safehouses}` : '--', label: t('landing.safehouseStat') },
    { value: liveStats ? `${liveStats.donations}+` : '--', label: t('landing.donationsReceived') },
    { value: liveStats ? `${liveStats.partners}` : '--', label: t('landing.partnerOrgs') },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section
        className="relative overflow-hidden bg-slate-900 px-4 py-24 sm:px-6 lg:py-32"
        style={{
          backgroundImage:
            "url('/landing-hero.jpg'), url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80')",
          backgroundPosition: 'top center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          minHeight: '70vh',
        }}
      >
        <div className="absolute inset-0 bg-slate-900/60" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          <h1 className="font-heading text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            {t('landing.heroTitle')} <span className="text-golden-honey">{t('landing.heroTitleBrand')}</span>
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-100/90 sm:text-lg">
            {t('landing.heroTagline')}
          </p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-100/80 sm:text-lg">
            {t('landing.heroDescription')}
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link to="/impact">
              <Button variant="primary" size="lg">
                {t('landing.seeImpact')}
              </Button>
            </Link>
            <Link to="/login">
              <Button
                variant="ghost"
                size="lg"
                className="border border-white/25 text-white hover:bg-white/10"
              >
                {t('landing.staffLogin')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Impact Stats Strip */}
      <section className="bg-sage-green/10 px-4 py-16 dark:bg-sage-green/5 sm:px-6">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-heading text-4xl font-bold text-golden-honey-text dark:text-golden-honey sm:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-navy dark:text-white/80 sm:text-base">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission Pillars */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 text-center font-heading text-3xl font-bold text-slate-navy dark:text-white sm:text-4xl">
            {t('landing.whatWeDo')}
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {pillars.map((pillar) => (
              <Card key={pillar.title} className="text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-sky-blue/20">
                  <pillar.icon className="h-7 w-7 text-sky-blue" />
                </div>
                <h3 className="mb-3 font-heading text-xl font-semibold text-slate-navy dark:text-white">
                  {pillar.title}
                </h3>
                <p className="leading-relaxed text-warm-gray dark:text-white/70">
                  {pillar.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-coral-pink/20 px-4 py-20 dark:bg-coral-pink/10 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <h2 className="font-heading text-3xl font-bold text-slate-navy dark:text-white sm:text-4xl">
            {t('landing.joinMission')}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-warm-gray dark:text-white/70">
            {t('landing.joinMissionDesc')}
          </p>
          <Link to="/donate" className="mt-8">
            <Button variant="primary" size="lg">
              {t('landing.donateNow')}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
