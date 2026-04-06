import { useState } from 'react';
import Cookies from 'js-cookie';
import { Button } from '../../components/ui/Button';

export function CookieConsentBanner() {
  const [dismissed, setDismissed] = useState(
    () => Cookies.get('nd_cookie_consent') === 'accepted',
  );

  if (dismissed) return null;

  const accept = () => {
    Cookies.set('nd_cookie_consent', 'accepted', { expires: 365 });
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-navy/10 bg-white p-4 shadow-lg dark:border-white/10 dark:bg-slate-navy">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-warm-gray dark:text-white/70">
          We use cookies to improve your experience. By continuing to use this site you
          agree to our cookie policy.
        </p>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={accept}>
            Accept
          </Button>
          <Button variant="ghost" size="sm" onClick={accept}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
