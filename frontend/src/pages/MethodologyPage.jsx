import PageFade from '../components/Layout/PageFade';

export default function MethodologyPage() {
  return (
    <PageFade className="p-5 md:p-8 max-w-[900px] mx-auto space-y-6 text-sm text-body leading-relaxed">
      <p className="text-muted">
        EquityGrid combines three complementary layers — a transparent scoring function, classical anomaly-style rules,
        and a large-language explainability pass — so outcomes are reproducible, outliers are surfaced, and each
        classification can be narrated for oversight.
      </p>

      <section className="card p-5 space-y-3">
        <h2 className="text-lg font-bold text-primary">Layer 1 — Scoring model (six weighted variables)</h2>
        <p className="text-muted">
          Each account is scored from exactly six inputs: consumption per capita proxy (kWh per person versus a national
          benchmark), payment consistency (disconnection days per month), NSPS social-protection registration status,
          evening peak demand ratio, upgrade history (three-phase service and connection kVA), and the count of active
          meters registered at the same address. County NSPS coverage can nuance the interpretation for households not
          on the register. Urban / rural classification may be stored for maps and narratives but is not a scored
          variable.
        </p>
        <p className="text-muted">
          Weights sum to 100%: 25% / 22% / 18% / 15% / 12% / 8% respectively. The composite score maps to GREEN, YELLOW,
          or RED tariff bands using fixed thresholds so regulators can audit the same arithmetic the API applies.
        </p>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="text-lg font-bold text-primary">Layer 2 — Anomaly detection (rules + cohort context)</h2>
        <p className="text-muted">
          Beyond the weighted score, deterministic rules highlight unusual combinations — for example very high
          consumption per person inside historically poor counties while still clearing as RED. Those cases feed the
          Alerts view as structured flags rather than a second opaque model.
        </p>
        <p className="text-muted">
          Isolation-forest style clustering remains a plausible extension; the current MVP emphasises inspectable
          triggers tied to the same six inputs.
        </p>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="text-lg font-bold text-primary">Layer 3 — Plain-English explainability (LLM)</h2>
        <p className="text-muted">
          After scoring, we package county, tariff band, final score, kWh per person versus the benchmark, disconnection
          days, NSPS registration, peak ratio, three-phase status, and meters at the address into a short prompt for
          Claude or GPT. The model returns two sentences a regulator or minister can read — the same structure shown
          under Account Lookup when API keys are not wired in.
        </p>
        <p className="text-muted">
          That pairing keeps the stack reviewable: the quantitative record and the narrative cite the same facts, with
          no undisclosed weights inside the LLM prompt beyond what is already public in the scoring specification.
        </p>
      </section>

      <section className="card p-5 bg-navactive/40 border-primary/10">
        <h3 className="text-sm font-bold text-primary mb-2">In one line</h3>
        <p className="text-muted">
          A fixed six-variable function scores the household, rule-based flags catch extreme combinations, and an LLM
          explains the outcome in plain English for non-technical stakeholders.
        </p>
      </section>
    </PageFade>
  );
}
