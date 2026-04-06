import { Link } from 'react-router-dom';
import { Heart, Sparkles, GraduationCap } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import logo from '../../assets/logo.png';

const stats = [
  { value: '60+', label: 'Girls Served' },
  { value: '9', label: 'Safehouses' },
  { value: '420+', label: 'Donations Received' },
  { value: '30', label: 'Partner Organizations' },
];

const pillars = [
  {
    icon: Heart,
    title: 'Caring',
    description:
      'We provide 24/7 safe shelter, nutritious meals, and a loving community where girls can begin to feel safe again.',
  },
  {
    icon: Sparkles,
    title: 'Healing',
    description:
      'Through professional counseling, health monitoring, and emotional support, we help survivors process trauma and rebuild confidence.',
  },
  {
    icon: GraduationCap,
    title: 'Teaching',
    description:
      'Education is the path forward. We provide schooling, vocational training, and life skills to prepare girls for independent futures.',
  },
];

export function LandingPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-sky-blue/30 px-4 py-20 dark:from-slate-navy dark:to-sky-blue/10 sm:px-6 sm:py-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <img
            src={logo}
            alt="New Dawn - A Path to Healing and Hope"
            className="mb-8 h-24 sm:h-32"
          />
          <h1 className="font-heading text-4xl font-bold text-slate-navy dark:text-white sm:text-5xl lg:text-6xl">
            New Dawn
          </h1>
          <p className="mt-3 font-heading text-lg font-medium text-golden-honey sm:text-xl">
            A Path to Healing and Hope
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-warm-gray dark:text-white/70 sm:text-lg">
            We provide safe harbor for girls in crisis, guiding them from
            darkness toward the promise of a new dawn. Through our network of
            safehouses across the Philippines, we offer shelter, healing,
            education, and the support needed to rebuild their lives.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link to="/impact">
              <Button variant="primary" size="lg">
                See Our Impact
              </Button>
            </Link>
            <Link to="/login">
              <Button
                variant="ghost"
                size="lg"
                className="border border-slate-navy/20 dark:border-white/20"
              >
                Staff Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Impact Stats Strip */}
      <section className="bg-sage-green/10 px-4 py-16 dark:bg-sage-green/5 sm:px-6">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-heading text-4xl font-bold text-golden-honey sm:text-5xl">
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
            What We Do
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
            Join Our Mission
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-warm-gray dark:text-white/70">
            Every donation helps a girl take one step closer to her new dawn.
          </p>
          <a href="#" className="mt-8">
            <Button variant="primary" size="lg">
              Donate Now
            </Button>
          </a>
        </div>
      </section>
    </div>
  );
}
