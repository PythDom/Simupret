/**
 * Mensualité constante d'un prêt de `principal` sur `months` mois au taux
 * mensuel `rate`. Gère le taux nul (remboursement linéaire).
 */
export function annuityPayment(principal: number, rate: number, months: number): number {
  if (months <= 0) return principal;
  if (rate === 0) return principal / months;
  return (principal * rate) / (1 - Math.pow(1 + rate, -months));
}

/** Capital amorti chaque mois en amortissement constant. */
export function constantPrincipal(principal: number, months: number): number {
  return months <= 0 ? principal : principal / months;
}
