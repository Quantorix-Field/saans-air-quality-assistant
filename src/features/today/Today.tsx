export function Today() {
  return (
    <section className="section">
      <div className="container">
        <div className="empty-state">
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="3" />
            <path
              d="M40 24v16l10 6"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="40" cy="40" r="3" fill="currentColor" />
          </svg>
          <h2>Choose your city to see today's air</h2>
          <p>
            Saans reads live air quality data for your chosen city and turns it
            into plain-language guidance — when to go out, what to do indoors,
            and how to protect yourself and your family.
          </p>
          <p>
            City selection and personalised advice are coming in the next phase.
            For now, explore the app structure and design.
          </p>
        </div>
      </div>
    </section>
  );
}
