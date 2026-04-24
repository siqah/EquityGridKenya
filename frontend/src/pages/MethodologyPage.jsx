import PageFade from '../components/Layout/PageFade';

export default function MethodologyPage() {
  return (
    <PageFade className="p-5 md:p-8 max-w-[900px] mx-auto space-y-6 text-sm text-body leading-relaxed">
      <p className="text-muted">
        EquityGrid combines three complementary “AI” layers — two classical ML roles and one large-language
        explainability pass — so scores are data-driven, anomalies are surfaced, and every outcome can be narrated for
        oversight.
      </p>

      <section className="card p-5 bg-navactive/40 border-primary/10">
        <h2 className="text-lg font-bold text-primary mb-2">The Dual-Savings Objective</h2>
        <p className="text-muted mb-2">
          <strong>1. Making the Consumer Pay Less:</strong> By optimizing how baseline allocations are distributed, the model ensures everyday consumers reliably access affordable lifeline tariffs without carrying the cost of systemic misuse.
        </p>
        <p className="text-muted">
          <strong>2. Making EPRA Pay Less:</strong> By detecting high-draw anomalies and stopping subsidy leakage, regulators dramatically reduce the financial burden of the subsidy pool and defer expensive peak-load infrastructure upgrades.
        </p>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="text-lg font-bold text-primary">Layer 1 — Scoring model (supervised ML)</h2>
        <p className="text-muted">
          A supervised classifier (Random Forest or gradient boosting) ingests eight structured variables for each
          account — consumption per capita, payment consistency, peak-demand ratio, upgrade history, consumption variance,
          linked active meters, time-of-use profile, and connection age — and outputs a 0–100 risk / equity score.
        </p>
        <p className="text-muted">
          Unlike a fixed hand-tuned formula, the model learns which combinations of signals separate genuine vulnerability
          from disguised wealth. It can surface patterns humans might miss (for example low monthly kWh with suspiciously
          high peak ratios and clustered meters). For the hackathon we train on the synthetic cohort, hold out a test
          slice, and report accuracy — even ~75% on synthetic data demonstrates the methodology end-to-end.
        </p>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="text-lg font-bold text-primary">Layer 2 — Anomaly detection (unsupervised ML)</h2>
        <p className="text-muted">
          An isolation forest learns the shape of “normal” GREEN and “normal” RED neighbourhoods in feature space, then
          highlights accounts that do not sit cleanly in either cluster. That is the hook for threshold gaming: a user
          who keeps consumption just under lifeline limits every month produces a variance signature that is statistically
          odd even among GREEN households.
        </p>
        <p className="text-muted">
          This layer feeds the Anomaly Alerts view — it is the dedicated fraud / leakage radar sitting on top of the
          supervised score.
        </p>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="text-lg font-bold text-primary">Layer 3 — Plain-English explainability (LLM)</h2>
        <p className="text-muted">
          After scoring, we package the eight signal values, county poverty context, tariff band, and flags into a prompt
          for Claude or GPT. The model returns two short sentences a regulator, judge, or minister can read — the same
          narrative you see stubbed on the Account Lookup page when API keys are not wired in.
        </p>
        <p className="text-muted">
          That is what makes the stack legally defensible: every classification can be paired with a human-readable
          rationale that cites the same quantitative inputs auditors already have on file.
        </p>
      </section>

      <section className="card p-5 bg-navactive/40 border-primary/10">
        <h3 className="text-sm font-bold text-primary mb-2">In one line</h3>
        <p className="text-muted">
          ML scores the household, isolation forests catch weirdness inside those scores, and an LLM explains the outcome
          in plain Kiswahili or English for non-technical stakeholders.
        </p>
      </section>
    </PageFade>
  );
}
