import { Link } from 'react-router-dom';

function IconWind() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M4 10h14a4 4 0 0 0 0-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M4 14h18a4 4 0 0 1 0 8H20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M4 18h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2.2"/>
      <path d="M14 8v6l4 2.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconHome() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M4 14L14 5l10 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 12v10a1 1 0 0 0 1 1h5v-6h4v6h5a1 1 0 0 0 1-1V12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconLeaf() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M5 23C5 23 7 14 14 11C21 8 23 5 23 5C23 5 21 15 14 18C7 21 5 23 5 23Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 23l5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M4 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9l-5 4V6Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 10h10M9 14h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="5" y="13" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2.2"/>
      <path d="M9 13V9a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx="14" cy="19" r="1.5" fill="currentColor"/>
    </svg>
  );
}

const FEATURES = [
  {
    icon: <IconWind />,
    title: 'Live air + personal risk',
    desc: 'Real-time NAQI from Open-Meteo, adjusted for your age, health conditions and activity level.',
  },
  {
    icon: <IconClock />,
    title: 'Best hours to go out',
    desc: 'The three cleanest windows in the next 48 hours, ranked by dose at your activity level.',
  },
  {
    icon: <IconHome />,
    title: 'Indoor air playbook',
    desc: 'When to ventilate, purifier settings, the Corsi–Rosenthal box trick and what actually works.',
  },
  {
    icon: <IconLeaf />,
    title: 'Greener choices with real impact',
    desc: 'Your commute in kg CO₂e per month. Metro vs car, the honest numbers – including the dose trade-off.',
  },
  {
    icon: <IconChat />,
    title: 'Ask Saans in English or Hindi',
    desc: 'Powered by Gemini, grounded in facts only your code computed. AI-free fallback always on.',
  },
  {
    icon: <IconLock />,
    title: 'Privacy by design',
    desc: 'No accounts, no cookies, no analytics. Your profile and location stay on your device.',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Choose your city',
    desc: 'Search any Indian city. Coordinates are rounded before leaving your device.',
  },
  {
    n: '2',
    title: 'Tell us about yourself',
    desc: 'Age group, health conditions, how you commute. Stored only in your browser.',
  },
  {
    n: '3',
    title: 'Get plain-language guidance',
    desc: 'Know when to go out, how to protect yourself indoors, and what every choice costs the planet.',
  },
];

const FAQS = [
  {
    q: 'Where does the air quality data come from?',
    a: 'From Open-Meteo, which provides modelled data from the Copernicus Atmosphere Monitoring Service (CAMS). It is a forecast model, not a ground sensor – we say so clearly in every view. The data is typically updated every hour.',
  },
  {
    q: 'Is this medical advice?',
    a: "No. Saans gives general guidance based on publicly available research and CPCB guidelines. It is not a substitute for a doctor's advice. If you experience chest pain, severe breathlessness, or wheezing that does not settle, please seek medical care immediately.",
  },
  {
    q: 'What data is stored about me?',
    a: "Nothing leaves your device. Your city, health profile, and preferences are stored only in your browser's localStorage. We have no accounts, no analytics, and no cookies.",
  },
  {
    q: 'How accurate is the NAQI calculation?',
    a: 'We implement the official CPCB NAQI formula with the published breakpoints. The underlying concentration data is a model, not a sensor reading, so treat the band (Good / Moderate / Poor, etc.) as a planning tool, not a clinical measurement.',
  },
];

export function Landing() {
  return (
    <>
      {/* Hero */}
      <section className="section" aria-labelledby="hero-heading" style={{ paddingBlockStart: 'var(--space-20)' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: 760 }}>
          <h1 id="hero-heading" className="hero-reveal" style={{ fontSize: 'var(--text-4xl)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Know your air.<br />Protect your breath.
          </h1>
          <p
            className="hero-reveal-delay-1"
            style={{ fontSize: 'var(--text-lg)', color: 'var(--muted)', marginBlock: 'var(--space-6)', maxWidth: '55ch', marginInline: 'auto' }}
          >
            Saans turns live air quality into daily decisions – the safest hour
            to run, the right indoor playbook, the real cost of your commute.
            For every city in India, free, private.
          </p>
          <div className="hero-reveal-delay-2" style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/app" className="btn btn-primary">
              Check air quality now
            </Link>
            <a href="#how-it-works" className="btn btn-secondary">
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="section" aria-labelledby="how-heading" style={{ background: 'var(--surface)' }}>
        <div className="container">
          <h2
            id="how-heading"
            style={{ textAlign: 'center', marginBottom: 'var(--space-12)', fontSize: 'var(--text-3xl)' }}
          >
            How it works
          </h2>
          <ol className="steps-grid" style={{ listStyle: 'none', paddingLeft: 0 }}>
            {STEPS.map((step, i) => (
              <li key={step.n} className={`stagger-${i + 1}`}>
                <div className="step-number" aria-hidden="true">{step.n}</div>
                <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>{step.title}</h3>
                <p style={{ color: 'var(--muted)' }}>{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What you get */}
      <section className="section" aria-labelledby="features-heading">
        <div className="container">
          <h2
            id="features-heading"
            style={{ textAlign: 'center', marginBottom: 'var(--space-12)', fontSize: 'var(--text-3xl)' }}
          >
            What you get
          </h2>
          <ul className="feature-grid" style={{ listStyle: 'none', paddingLeft: 0 }}>
            {FEATURES.map((f, i) => (
              <li key={f.title} className={`card stagger-${i + 1}`}>
                <div style={{ color: 'var(--accent)', marginBottom: 'var(--space-3)' }}>{f.icon}</div>
                <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>{f.title}</h3>
                <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>{f.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Privacy promise */}
      <section className="section" aria-labelledby="privacy-heading" style={{ background: 'var(--surface)' }}>
        <div className="container" style={{ maxWidth: 700 }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{ color: 'var(--accent)', display: 'inline-block', marginBottom: 'var(--space-4)' }}>
              <IconLock />
            </div>
            <h2 id="privacy-heading" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>
              Your data never leaves your device
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 'var(--text-lg)' }}>
              No accounts. No tracking cookies. No analytics. Your city, health
              profile and preferences are stored only in your browser. When you
              request air quality, your coordinates are rounded to two decimal
              places before they reach our server.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" aria-labelledby="faq-heading">
        <div className="container" style={{ maxWidth: 760 }}>
          <h2
            id="faq-heading"
            style={{ textAlign: 'center', marginBottom: 'var(--space-8)', fontSize: 'var(--text-3xl)' }}
          >
            Frequently asked questions
          </h2>
          <div>
            {FAQS.map((faq) => (
              <details key={faq.q}>
                <summary>{faq.q}</summary>
                <div className="details-content">
                  <p style={{ color: 'var(--muted)' }}>{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section" aria-labelledby="cta-heading" style={{ background: 'var(--surface)', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 600 }}>
          <h2 id="cta-heading" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>
            Breathe smarter, starting today
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-6)' }}>
            Free, open, and built on verified science. No sign-up required.
          </p>
          <Link to="/app" className="btn btn-primary" style={{ fontSize: 'var(--text-lg)' }}>
            Check air quality now
          </Link>
        </div>
      </section>
    </>
  );
}
