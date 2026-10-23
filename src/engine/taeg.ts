/**
 * Taux de rendement interne mensuel de flux mensuels (index = mois), par
 * dichotomie. Retourne `null` si aucun taux n'annule la valeur actuelle.
 */
export function monthlyIrr(flows: readonly number[]): number | null {
  const npv = (r: number) => {
    let v = 0;
    let discount = 1;
    for (const f of flows) {
      v += f * discount;
      discount /= 1 + r;
    }
    return v;
  };
  // Bornes : −5 % à +100 % par mois. Une borne basse plus négative ferait
  // déborder les facteurs d'actualisation sur 100 ans (1/(1+r)^1200).
  let lo = -0.05;
  let hi = 1;
  let fLo = npv(lo);
  const fHi = npv(hi);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (fMid === 0) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
    if (hi - lo < 1e-15) break;
  }
  return (lo + hi) / 2;
}

/**
 * TAEG : taux annuel effectif global, (1 + TRI mensuel)^12 − 1, calculé sur
 * les flux réels (fonds reçus, mensualités, remboursements anticipés,
 * indemnités, frais et assurances). Approximation : 1 mois = 1/12 d'année.
 */
export function taeg(flows: readonly number[]): number | null {
  const r = monthlyIrr(flows);
  return r === null ? null : Math.pow(1 + r, 12) - 1;
}
