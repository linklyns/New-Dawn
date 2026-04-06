import { PageHeader } from '../../components/layout/PageHeader';

const sections = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'information-we-collect', label: 'Information We Collect' },
  { id: 'how-we-use', label: 'How We Use Your Information' },
  { id: 'cookies', label: 'Cookie Policy' },
  { id: 'data-sharing', label: 'Data Sharing' },
  { id: 'data-security', label: 'Data Security' },
  { id: 'your-rights', label: 'Your Rights (GDPR)' },
  { id: 'data-retention', label: 'Data Retention' },
  { id: 'childrens-privacy', label: "Children's Privacy" },
  { id: 'contact', label: 'Contact Us' },
  { id: 'updates', label: 'Updates' },
];

export function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader title="Privacy Policy" subtitle="Last updated: April 2026" />

      <div className="mx-auto max-w-4xl">
        {/* Table of Contents */}
        <nav className="mb-10 rounded-xl border border-slate-navy/10 bg-sage-green/5 p-6 dark:border-white/10 dark:bg-sage-green/5">
          <h2 className="mb-3 font-heading text-lg font-semibold text-slate-navy dark:text-white">
            Table of Contents
          </h2>
          <ol className="grid gap-1 sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm text-warm-gray transition-colors hover:text-golden-honey dark:text-white/70 dark:hover:text-golden-honey"
                >
                  {i + 1}. {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <div className="space-y-10 text-warm-gray leading-relaxed dark:text-white/80">
          {/* 1. Introduction */}
          <section id="introduction">
            <h2 className="mb-3 font-heading text-2xl font-semibold text-slate-navy dark:text-white">
              1. Introduction
            </h2>
            <p>
              New Dawn is committed to protecting your privacy and ensuring the
              security of all personal information entrusted to us. This Privacy
              Policy explains how we collect, use, store, and protect your data
              when you interact with our website, make donations, or engage with
              our services.
            </p>
            <p className="mt-3">
              By using our website or services, you acknowledge that you have
              read and understood this policy. If you have questions, please
              contact us using the details provided below.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section id="information-we-collect">
            <h2 className="mb-3 font-heading text-2xl font-semibold text-slate-navy dark:text-white">
              2. Information We Collect
            </h2>

            <h3 className="mb-2 mt-4 font-heading text-lg font-medium text-slate-navy dark:text-white">
              Personal Information (Donors and Supporters)
            </h3>
            <p>
              When you make a donation or register as a supporter, we may collect
              your name, email address, mailing address, phone number, and
              payment information. This data is used solely for processing
              donations, issuing receipts, and communicating about our mission.
            </p>

            <h3 className="mb-2 mt-4 font-heading text-lg font-medium text-slate-navy dark:text-white">
              Case Data (Residents)
            </h3>
            <p>
              For the girls in our care, we collect information necessary for
              providing services, including health records, educational progress,
              counseling notes, and case management data. This information is
              <strong className="text-slate-navy dark:text-white"> highly confidential </strong>
              and subject to the strictest access controls. It is never shared
              publicly or with unauthorized parties.
            </p>

            <h3 className="mb-2 mt-4 font-heading text-lg font-medium text-slate-navy dark:text-white">
              Website Usage Data
            </h3>
            <p>
              We may collect anonymized usage data such as pages visited, time
              spent on our site, browser type, and device information. This data
              helps us improve the website experience and is only collected with
              your consent.
            </p>
          </section>

          {/* 3. How We Use Your Information */}
          <section id="how-we-use">
            <h2 className="mb-3 font-heading text-2xl font-semibold text-slate-navy dark:text-white">
              3. How We Use Your Information
            </h2>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong className="text-slate-navy dark:text-white">Service Delivery:</strong>{' '}
                To provide shelter, care, counseling, and educational services to
                the girls in our safehouses.
              </li>
              <li>
                <strong className="text-slate-navy dark:text-white">Donor Communication:</strong>{' '}
                To process donations, send tax receipts, and share updates about
                our impact with supporters who have opted in.
              </li>
              <li>
                <strong className="text-slate-navy dark:text-white">Analytics and Improvement:</strong>{' '}
                To understand how visitors use our website so we can improve
                content, accessibility, and user experience.
              </li>
            </ul>
          </section>

          {/* 4. Cookie Policy */}
          <section id="cookies">
            <h2 className="mb-3 font-heading text-2xl font-semibold text-slate-navy dark:text-white">
              4. Cookie Policy
            </h2>
            <p>Our website uses a limited number of cookies:</p>

            <h3 className="mb-2 mt-4 font-heading text-lg font-medium text-slate-navy dark:text-white">
              Functional Cookies
            </h3>
            <p>
              These cookies are necessary for core website functionality, such as
              remembering your dark/light mode preference and cookie consent
              choice. They do not track you across other websites.
            </p>

            <h3 className="mb-2 mt-4 font-heading text-lg font-medium text-slate-navy dark:text-white">
              Analytics Cookies (Consent Required)
            </h3>
            <p>
              With your explicit consent, we may use analytics cookies to gather
              anonymized data about site usage. You can manage your preferences
              at any time through the cookie consent banner on our site.
            </p>
          </section>

          {/* 5. Data Sharing */}
          <section id="data-sharing">
            <h2 className="mb-3 font-heading text-2xl font-semibold text-slate-navy dark:text-white">
              5. Data Sharing
            </h2>
            <p>
              We never sell personal data. We do not share individual donor or
              resident information with third parties for marketing purposes. We
              may share anonymized, aggregate data in public impact reports to
              demonstrate the outcomes of our programs. Where required by law, we
              may disclose information to government authorities in accordance
              with Philippine regulations and international child protection
              standards.
            </p>
          </section>

          {/* 6. Data Security */}
          <section id="data-security">
            <h2 className="mb-3 font-heading text-2xl font-semibold text-slate-navy dark:text-white">
              6. Data Security
            </h2>
            <p>We take data security seriously and employ multiple safeguards:</p>
            <ul className="ml-5 mt-3 list-disc space-y-2">
              <li>
                <strong className="text-slate-navy dark:text-white">Encryption:</strong>{' '}
                All data is encrypted in transit (TLS/SSL) and at rest.
              </li>
              <li>
                <strong className="text-slate-navy dark:text-white">Access Controls:</strong>{' '}
                Role-based access ensures that only authorized staff can view
                sensitive resident data.
              </li>
              <li>
                <strong className="text-slate-navy dark:text-white">Secure Hosting:</strong>{' '}
                Our systems are hosted on secure, audited cloud infrastructure
                with regular security assessments.
              </li>
              <li>
                <strong className="text-slate-navy dark:text-white">Staff Training:</strong>{' '}
                All staff receive regular training on data protection best
                practices and incident response.
              </li>
            </ul>
          </section>

          {/* 7. Your Rights (GDPR) */}
          <section id="your-rights">
            <h2 className="mb-3 font-heading text-2xl font-semibold text-slate-navy dark:text-white">
              7. Your Rights (GDPR)
            </h2>
            <p>
              Under the General Data Protection Regulation (GDPR) and the
              Philippine Data Privacy Act of 2012, you have the following rights:
            </p>
            <ul className="ml-5 mt-3 list-disc space-y-2">
              <li>
                <strong className="text-slate-navy dark:text-white">Right to Access:</strong>{' '}
                Request a copy of the personal data we hold about you.
              </li>
              <li>
                <strong className="text-slate-navy dark:text-white">Right to Rectification:</strong>{' '}
                Request correction of inaccurate or incomplete data.
              </li>
              <li>
                <strong className="text-slate-navy dark:text-white">Right to Erasure:</strong>{' '}
                Request deletion of your personal data, subject to legal
                retention requirements.
              </li>
              <li>
                <strong className="text-slate-navy dark:text-white">Right to Portability:</strong>{' '}
                Receive your data in a structured, machine-readable format.
              </li>
              <li>
                <strong className="text-slate-navy dark:text-white">Right to Object:</strong>{' '}
                Object to processing of your data for specific purposes,
                including direct marketing.
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us at{' '}
              <a
                href="mailto:privacy@newdawn.ph"
                className="text-golden-honey underline"
              >
                privacy@newdawn.ph
              </a>
              . We will respond to all requests within 30 days.
            </p>
          </section>

          {/* 8. Data Retention */}
          <section id="data-retention">
            <h2 className="mb-3 font-heading text-2xl font-semibold text-slate-navy dark:text-white">
              8. Data Retention
            </h2>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong className="text-slate-navy dark:text-white">Donor Data:</strong>{' '}
                Retained for seven (7) years after the last transaction for tax
                and regulatory compliance purposes, then securely deleted.
              </li>
              <li>
                <strong className="text-slate-navy dark:text-white">Case Data:</strong>{' '}
                Retained in accordance with Philippines Department of Social
                Welfare and Development (DSWD) regulations, with strict access
                controls throughout the retention period.
              </li>
              <li>
                <strong className="text-slate-navy dark:text-white">Website Analytics:</strong>{' '}
                Anonymized analytics data is retained for up to 24 months.
              </li>
            </ul>
          </section>

          {/* 9. Children's Privacy */}
          <section id="childrens-privacy">
            <h2 className="mb-3 font-heading text-2xl font-semibold text-slate-navy dark:text-white">
              9. Children&apos;s Privacy
            </h2>
            <p>
              Given the nature of our mission, we handle data relating to minors
              with the highest level of care and protection. All resident data
              for minors is subject to heightened security controls, restricted
              access, and is never included in public reports or analytics. We
              comply with all applicable child protection laws in the
              Philippines, including the Special Protection of Children Against
              Abuse, Exploitation and Discrimination Act.
            </p>
          </section>

          {/* 10. Contact Us */}
          <section id="contact">
            <h2 className="mb-3 font-heading text-2xl font-semibold text-slate-navy dark:text-white">
              10. Contact Us
            </h2>
            <p>
              If you have questions about this Privacy Policy or wish to exercise
              your data rights, please contact our Data Protection Officer:
            </p>
            <div className="mt-4 rounded-lg border border-slate-navy/10 bg-sky-blue/5 p-5 dark:border-white/10 dark:bg-sky-blue/5">
              <p className="font-medium text-slate-navy dark:text-white">
                New Dawn Data Protection Officer
              </p>
              <p className="mt-1">
                Email:{' '}
                <a
                  href="mailto:privacy@newdawn.ph"
                  className="text-golden-honey underline"
                >
                  privacy@newdawn.ph
                </a>
              </p>
              <p className="mt-1">
                Address: New Dawn Foundation, Manila, Philippines
              </p>
            </div>
          </section>

          {/* 11. Updates */}
          <section id="updates">
            <h2 className="mb-3 font-heading text-2xl font-semibold text-slate-navy dark:text-white">
              11. Updates
            </h2>
            <p>
              We may update this Privacy Policy from time to time to reflect
              changes in our practices, legal requirements, or services. When we
              make material changes, we will notify users through a notice on our
              website. We encourage you to review this page periodically.
            </p>
            <p className="mt-3 font-medium text-slate-navy dark:text-white">
              Last updated: April 2026
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
