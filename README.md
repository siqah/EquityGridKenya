# EquityGrid Kenya

Energy equity intelligence for smart grid policy. Built for Kenya’s energy sector regulators (EPRA) and utility providers, EquityGrid Kenya is a decision-support platform designed to ensure fair, cost-saving, and data-driven electricity subsidy distribution.

---

## The Problem

Energy regulators in developing markets face a double-edged challenge when designing social tariffs:
1. **Inefficient Subsidy Targeting:** Lifeline tariffs are often misallocated. Affluent households with heavy discretionary loads (such as luxury appliances, air conditioning, and multi-meter addresses) bypass limits and consume subsidized energy intended for vulnerable families.
2. **Rising Fiscal & Grid Burdens:** Subsidy leakage balloons government and utility expenditures. Concurrently, unmanaged peak demand (especially the 6:00 PM – 10:00 PM evening peak) triggers expensive grid infrastructure strain and capacity upgrades.

---

## The Solution

**EquityGrid Kenya** processes geographic, payment consistency, and consumption metrics to score and classify households. It creates a **Dual-Savings** ecosystem:

1. **Protecting Vulnerable Consumers:** Mapped households (assigned the **GREEN** band) reliably access affordable lifeline tariffs (suggested **0.60×** multiplier) to support basic energy needs.
2. **Optimizing Utility & Regulator Budgets:** High-draw or affluent households (assigned the **RED** band) are identified and billed as cross-subsidy contributors (suggested **1.40×** multiplier). This drastically reduces public subsidy expenditure and deters peak-hour load surges.

### Six-Variable Equity Model
To classify households accurately without violating individual privacy, the platform uses a transparent, weighted six-signal scorecard:
*   **Consumption per Capita Proxy (25%):** Normalizes monthly consumption by ward-level average household size against the national vulnerability benchmark.
*   **Payment Consistency (22%):** Assesses monthly disconnection days (stable ability to pay vs constrained access).
*   **NSPS Registration Status (18%):** Automatically aligns with the National Social Protection Single Registry to verify existing vulnerability status.
*   **Peak Demand Ratio (15%):** Measures the share of energy drawn during the expensive 6:00 PM – 10:00 PM evening peak window.
*   **Upgrade History (12%):** Flags connection capacity (e.g. three-phase connections vs low-kVA single phase).
*   **Active Accounts at Address (8%):** Identifies multiple active meters registered at a single physical address.

---

## Project Documentation Directory

To maintain a clean and focused landing page, all technical specifications and instructions have been separated into dedicated modules:

*   📖 **System Design & Spec:** For details on SQLAlchemy models, API contracts, formulas, and security compliance, read [ARCHITECTURE_AND_DESIGN.md](file:///Users/app/Desktop/EquityGridKenya/ARCHITECTURE_AND_DESIGN.md).
*   🚀 **Deployment & Running:** For instructions to build the React frontend, run the FastAPI backend, execute docker containers, and run database seed scripts, read [DEPLOYMENT_AND_MONOLITH_GUIDE.md](file:///Users/app/Desktop/EquityGridKenya/DEPLOYMENT_AND_MONOLITH_GUIDE.md).
