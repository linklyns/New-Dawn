import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores/authStore';

const donationTiers = [
  { amount: 25, label: 'Supporter', description: 'Provides school supplies for one girl for a month.' },
  { amount: 50, label: 'Champion', description: 'Covers nutritious meals for a girl for two weeks.' },
  { amount: 100, label: 'Guardian', description: 'Funds counseling sessions to support trauma recovery.' },
  { amount: 250, label: 'Beacon of Hope', description: 'Sponsors one month of full safehouse care for a resident.' },
];

export function DonatePage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [customAmount, setCustomAmount] = useState('');

  const openPrefilledDonate = (amount: number) => {
    navigate(`/admin/donations?openNew=1&amount=${amount}&donationType=Monetary&channelSource=Website`);
  };

  const handleCustomDonate = () => {
    const parsed = Number(customAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    openPrefilledDonate(parsed);
  };

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
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => openPrefilledDonate(tier.amount)}
                    >
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

          {/* Custom Amount */}
          <Card className="mt-6">
            <h3 className="font-heading text-xl font-semibold text-slate-navy dark:text-white">
              Custom Amount
            </h3>
            <p className="mt-2 text-sm text-warm-gray dark:text-white/70">
              Choose any amount that feels right for you.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="sm:max-w-xs sm:flex-1">
                <Input
                  label="Amount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Enter custom amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                />
              </div>
              {isAuthenticated ? (
                <Button
                  variant="primary"
                  onClick={handleCustomDonate}
                  disabled={!customAmount || Number(customAmount) <= 0}
                >
                  <CreditCard size={16} className="mr-2" />
                  Donate Custom Amount
                </Button>
              ) : (
                <Link to="/register?redirect=/donate">
                  <Button variant="primary">
                    Sign Up to Donate
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </Card>

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
