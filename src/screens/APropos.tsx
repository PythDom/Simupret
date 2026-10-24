export default function APropos() {
  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Avertissement</h2>
        <p>
          Cette application fournit une <strong>simulation indicative</strong>. Elle ne constitue ni une offre de
          crédit, ni un conseil financier, juridique ou fiscal.
        </p>
        <p>
          Les taux, frais et primes proposés par défaut sont des <strong>valeurs indicatives</strong> (octobre 2026)
          et ne reflètent pas nécessairement les conditions d&apos;un prêteur. Les frais d&apos;acte (inscription et
          mandat hypothécaires) dépendent de votre situation et doivent être vérifiés auprès de votre notaire.
        </p>
        <p>
          Seule l&apos;offre de crédit remise par le prêteur, avec sa fiche européenne d&apos;information
          standardisée (ESIS) et son TAEG, fait foi. Consultez votre banque, un courtier agréé ou un conseiller
          indépendant avant toute décision.
        </p>
      </section>
      <section className="card space-y-2">
        <h2 className="text-lg font-semibold">Conventions de calcul</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Taux mensuel équivalent : (1 + taux annuel)<sup>1/12</sup> − 1, conformément à la pratique belge.
          </li>
          <li>Les montants ne sont arrondis qu&apos;à l&apos;affichage.</li>
          <li>
            Aucune donnée personnelle ne quitte votre appareil : pas de compte, pas de serveur. Seul le bouton
            « Mettre à jour » de l&apos;écran Banques interroge le service public de données de la BCE (moyennes de la
            BNB).
          </li>
        </ul>
      </section>
      <section className="card space-y-1 text-sm text-slate-600 dark:text-slate-400">
        <p>Logiciel libre sous licence MIT.</p>
      </section>
    </div>
  );
}
