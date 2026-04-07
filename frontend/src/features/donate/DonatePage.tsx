import { Link } from 'react-router-dom';
import { Heart, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuthStore } from '../../stores/authStore';

const donationTiers = [
  { amount: 25, label: 'Supporter', description: 'Provides school supplies for one girl for a month.' },
  { amount: 50, label: 'Champion', description: 'Covers nutritious meals for a girl for two weeks.' },
  { amount: 100, label: 'Guardian', description: 'Funds counseling sessions to support trauma recovery.' },
  { amount: 250, label: 'Beacon of Hope', description: 'Sponsors one month of full safehouse care for a resident.' },
];

export function DonatePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="bg-gradient-to-b from-white to-coral-pink/10 dark:from-slate-navy dark:to-coral-pink/5">
      {/* Hero */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-coral-pink/30">
            <Heart className="h-8 w-8 text-golden-honey" />
          </div>
          <h1 className="font-heading text-4xl font-bold text-slate-navy dark:text-white sm:text-5xl">
            Make a Difference
          </h1>
          <p className="mt-4 text-lg text-warm-gray dark:text-white/70">
            Every donation helps a girl take one step closer to her new dawn.
            Your generosity funds shelter, healing, and education for survivors.
          </p>
        </div>
      </section>

      {/* Donation Tiers */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 sm:grid-cols-2">
            {donationTiers.map((tier) => (
              <Card key={tier.label} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-heading text-3xl font-bold text-golden-honey-text dark:text-golden-honey">
                      ${tier.amount}
                    </span>
                    <span className="text-sm text-warm-gray dark:text-white/60">/month</span>
                  </div>
                  <h3 className="mt-2 font-heading text-lg font-semibold text-slate-navy dark:text-white">
                    {tier.label}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-warm-gray dark:text-white/60">
                    {tier.description}
                  </p>
                </div>
                <div className="mt-6">
                  {isAuthenticated ? (
                    <Button variant="primary" size="sm" className="w-full">
                      <CreditCard size={16} className="mr-2" />
                      Donate ${tier.amount}
                    </Button>
                  ) : (
                    <Link to={`/register?redirect=/donate&tier=${tier.label.toLowerCase().replace(/ /g, '-')}`}>
                      <Button variant="primary" size="sm" className="w-full">
                        Sign Up to Donate
                        <ArrowRight size={16} className="ml-2" />
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Unauthenticated CTA */}
          {!isAuthenticated && (
            <div className="mt-12 rounded-2xl bg-sky-blue/10 p-8 text-center dark:bg-sky-blue/5">
              <h2 className="font-heading text-2xl font-bold text-slate-navy dark:text-white">
                Create an Account to Get Started
              </h2>
              <p className="mt-3 text-warm-gray dark:text-white/70">
                Sign up to track your donations, see your impact, and manage recurring giving.
              </p>
              <Link to="/register?redirect=/donate" className="mt-6 inline-block">
                <Button variant="primary" size="lg">
                  Create Your Account
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
