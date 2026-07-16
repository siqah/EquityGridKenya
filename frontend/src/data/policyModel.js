/**
 * Policy Simulation Model (Deep Module)
 *
 * Encapsulates core policy impact equations, growth projections,
 * and presentation mapping away from the React component layer.
 */

/**
 * Calculates policy impact forecasts over a 12-month period.
 * @param {Object} stats - The current synthetic cohort stats context
 * @param {number} greenDisc - The green tier lifeline discount percentage (0-50)
 * @param {number} redFee - The red tier premium surcharge percentage (0-30)
 * @returns {Object} { subsidyCost, feeRevenue, net, months }
 */
export function calculatePolicySimulation(stats, greenDisc, redFee) {
  const subsidyCost = Math.round((stats.subsidyManaged || 0) * (greenDisc / 50) * 0.85);
  const feeRevenue = Math.round((stats.leakageDetected || 0) * (redFee / 30) * 0.75);
  const net = feeRevenue - subsidyCost;

  const months = Array.from({ length: 12 }, (_, i) => {
    const growth = 1 + i * 0.015;
    return {
      month: `M${i + 1}`,
      current: Math.round((feeRevenue * 0.92 - subsidyCost * 1.05) * growth),
      conservative: Math.round((feeRevenue * 0.88 - subsidyCost * 0.97) * growth),
      aggressive: Math.round((feeRevenue * 1.05 - subsidyCost * 0.9) * growth),
    };
  });

  return { subsidyCost, feeRevenue, net, months };
}

/**
 * Maps the simulation state to structured display rows for comparison tables.
 * @param {Object} stats - The current synthetic cohort stats context
 * @param {number} greenDisc - The green tier lifeline discount percentage
 * @param {number} redFee - The red tier premium surcharge percentage
 * @param {Object} model - The calculated policy simulation output
 * @returns {Array<Object>} List of row specifications { label, current, conservative, aggressive }
 */
export function generateSimulationTableRows(stats, greenDisc, redFee, model) {
  return [
    {
      label: 'Avg bill — GREEN tier (model)',
      current: `KSh ${Math.round(900 - greenDisc * 6).toLocaleString()}`,
      conservative: `KSh ${Math.round(920 - greenDisc * 5.2).toLocaleString()}`,
      aggressive: `KSh ${Math.round(860 - greenDisc * 7.1).toLocaleString()}`,
    },
    {
      label: 'Avg bill — RED tier (model)',
      current: `KSh ${Math.round(2100 + redFee * 35).toLocaleString()}`,
      conservative: `KSh ${Math.round(2050 + redFee * 28).toLocaleString()}`,
      aggressive: `KSh ${Math.round(2250 + redFee * 44).toLocaleString()}`,
    },
    {
      label: 'Revenue impact (annual, est.)',
      current: `KSh ${Math.round(model.net * 0.6).toLocaleString()}`,
      conservative: `KSh ${Math.round(model.net * 0.85).toLocaleString()}`,
      aggressive: `KSh ${Math.round(model.net * 1.15).toLocaleString()}`,
    },
    {
      label: 'Households protected (GREEN)',
      current: `${stats.classification_counts?.GREEN ?? 0}`,
      conservative: `${Math.round((stats.classification_counts?.GREEN ?? 0) * 0.97)}`,
      aggressive: `${Math.round((stats.classification_counts?.GREEN ?? 0) * 1.04)}`,
    },
  ];
}
