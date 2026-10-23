import { act, fireEvent, screen, within } from '@testing-library/react';
import App from '../App';
import { defaultState } from '../state/defaults';
import { renderWithStore } from '../test-utils';
import Amortissement from './Amortissement';
import Comparateur from './Comparateur';
import Graphiques from './Graphiques';
import Optimiseur from './Optimiseur';
import Parametres from './Parametres';
import Scenarios from './Scenarios';

const NBSP = ' ';

describe('Paramètres', () => {
  it('calcule la quotité à partir de la valeur du bien', () => {
    renderWithStore(<Parametres />);
    expect(screen.getByText(/Quotité : 83,3/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Valeur du bien'), { target: { value: '260 000' } });
    expect(screen.getByText(/Quotité : 96,2/)).toBeInTheDocument();
    expect(screen.getByText(/tranche > 90/)).toBeInTheDocument();
  });

  it('affiche une erreur en français pour une saisie invalide', () => {
    renderWithStore(<Parametres />);
    fireEvent.change(screen.getByLabelText('Montant à emprunter'), { target: { value: 'abc' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Saisissez un nombre valide');
  });

  it('affiche la grille de taux indicative en pourcentage', () => {
    renderWithStore(<Parametres />);
    expect(screen.getAllByText('valeurs indicatives')).toHaveLength(2);
    expect(screen.getByLabelText('Taux 20 ans, quotité 80–90 %')).toHaveValue('3,67');
    expect(screen.getByLabelText('Taux 15 ans, quotité 80–90 %')).toHaveValue('3,55');
  });
});

describe('Scénarios', () => {
  it('affiche la synthèse du scénario sélectionné', () => {
    renderWithStore(<Scenarios />);
    expect(screen.getByText(`1${NBSP}464,03${NBSP}€`)).toBeInTheDocument();
    expect(screen.getByText(`101${NBSP}367${NBSP}€`)).toBeInTheDocument();
    // Avec les frais et assurances indicatifs : TAEG 4,06 %.
    expect(screen.getByText(`4,06${NBSP}%`)).toBeInTheDocument();
  });

  it('renomme, duplique et supprime un scénario', () => {
    renderWithStore(<Scenarios />);
    fireEvent.change(screen.getByLabelText('Nom du scénario'), { target: { value: 'Ma maison' } });
    expect(screen.getByRole('button', { name: /^Ma maison/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dupliquer Ma maison' }));
    expect(screen.getByRole('button', { name: /^Ma maison \(copie\)/ })).toBeInTheDocument();

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer Ma maison (copie)' }));
    expect(screen.queryByRole('button', { name: /^Ma maison \(copie\)/ })).toBeNull();
  });

  it('signale une tranche invalide', () => {
    renderWithStore(<Scenarios />);
    fireEvent.change(screen.getByLabelText('Taux annuel fixe'), { target: { value: '45' } });
    expect(screen.getAllByText(/Le taux annuel semble trop élevé/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Durée'), { target: { value: '600' } });
    expect(screen.getAllByText('La durée ne peut pas dépasser 40 ans.').length).toBeGreaterThan(0);
  });

  it('ajoute un remboursement anticipé récurrent', () => {
    renderWithStore(<Scenarios />);
    fireEvent.click(screen.getByRole('button', { name: 'Récurrent' }));
    expect(screen.getByText('Remboursement récurrent')).toBeInTheDocument();
    // 2 500 €/mois avec versements annuels : prêt soldé en 121 mois.
    expect(screen.getByText('10 ans et 1 mois')).toBeInTheDocument();
  });

  it('affiche le seuil de rentabilité du refinancement', () => {
    renderWithStore(<Scenarios />);
    fireEvent.click(screen.getByLabelText('Refinancer le crédit'));
    expect(screen.getByText('Seuil de rentabilité')).toBeInTheDocument();
    expect(screen.getByText('Économie totale')).toBeInTheDocument();
  });
});

describe('Comparateur', () => {
  it('compare les scénarios côte à côte', () => {
    renderWithStore(<Comparateur />);
    const table = screen.getByRole('table');
    expect(within(table).getByText('250 000 € sur 20 ans')).toBeInTheDocument();
    expect(within(table).getByText('Deux tranches 10 + 15 ans')).toBeInTheDocument();
    const interest = within(table).getByText('Intérêts totaux').closest('tr')!;
    expect(interest).toHaveTextContent(`101${NBSP}367${NBSP}€`);
    expect(interest).toHaveTextContent(`49${NBSP}933${NBSP}€`);
    expect(within(table).getByText('TAEG')).toBeInTheDocument();
  });

  it('demande au moins deux scénarios', () => {
    renderWithStore(<Comparateur />);
    fireEvent.click(screen.getByLabelText('250 000 € sur 20 ans'));
    expect(screen.getByText('Sélectionnez au moins deux scénarios pour les comparer.')).toBeInTheDocument();
  });
});

describe('Optimiseur', () => {
  it('affiche le top 5 et crée un scénario en un geste', () => {
    renderWithStore(<App />);
    act(() => {
      window.location.hash = '#/optimiseur';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByText('N° 1')).toBeInTheDocument();
    expect(screen.getByText('N° 5')).toBeInTheDocument();
    expect(screen.getByText(/250 000 € sur 10 ans à 3,40/)).toBeInTheDocument();
    expect(screen.getByText(/Prix de la flexibilité/)).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Créer un scénario' })[0]!);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByLabelText('Nom du scénario')).toHaveValue('Optimiseur n° 1');
    expect(screen.getByText(`2${NBSP}454,40${NBSP}€`)).toBeInTheDocument();
  });

  it('explique quand le budget est insuffisant', () => {
    const state = defaultState(new Date(2026, 9, 23));
    renderWithStore(<Optimiseur />, { ...state, settings: { ...state.settings, monthlyBudget: 1000 } });
    expect(screen.getByText(/^Budget insuffisant/)).toBeInTheDocument();
    expect(screen.queryByText('N° 1')).toBeNull();
  });
});

describe("Tableau d'amortissement", () => {
  it('affiche 240 mois puis 20 années', () => {
    renderWithStore(<Amortissement />);
    const rows = () => screen.getAllByRole('row').length - 1;
    expect(rows()).toBe(240);
    fireEvent.change(screen.getByLabelText('Période'), { target: { value: 'year' } });
    expect(rows()).toBe(20);
  });

  it('affiche une tranche seule', () => {
    renderWithStore(<Amortissement />);
    fireEvent.change(screen.getByLabelText('Scénario'), { target: { value: 'demo-10-15' } });
    expect(screen.getAllByRole('row').length - 1).toBe(180);
    fireEvent.change(screen.getByLabelText('Affichage'), { target: { value: 'demo-10-15-t1' } });
    expect(screen.getAllByRole('row').length - 1).toBe(120);
  });
});

describe('Graphiques', () => {
  it('affiche les quatre graphiques', () => {
    renderWithStore(<Graphiques />);
    for (const title of ['Solde restant dû', 'Mensualités par tranche', 'Intérêts cumulés et capital remboursé', 'Comparaison des coûts']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });
});

describe('frais, assurances et TAEG', () => {
  const state = () => defaultState(new Date(2026, 9, 23));

  it('le TAEG égale le taux sans frais ni assurance', () => {
    const st = state();
    const costs = { ...st.settings.costs, processingFees: 0, appraisalFees: 0, deedInscription: 0, balanceInsurance: { kind: 'none' as const } };
    renderWithStore(<Scenarios />, { ...st, settings: { ...st.settings, costs } });
    expect(screen.getByText(`3,67${NBSP}%`)).toBeInTheDocument();
  });

  it('les frais saisis dans Paramètres modifient le TAEG du comparateur', () => {
    renderWithStore(
      <>
        <Parametres />
        <Comparateur />
      </>,
    );
    const taegRow = () => screen.getByRole('rowheader', { name: /^TAEG/ }).closest('tr')!;
    const before = taegRow().textContent;
    fireEvent.change(screen.getByLabelText('Frais de dossier'), { target: { value: '5 000' } });
    expect(taegRow().textContent).not.toBe(before);
  });

  it('ajoute une tranche à 0 % avec réduction', () => {
    renderWithStore(<Scenarios />);
    fireEvent.click(screen.getByRole('button', { name: 'Tranche à 0 % (type Rénopack)' }));
    expect(screen.getByText('Prêt à 0 % (type Rénopack)')).toBeInTheDocument();
    const reductions = screen.getAllByLabelText('Réduction du montant à rembourser');
    fireEvent.change(reductions[1]!, { target: { value: '3 000' } });
    expect(screen.getByText('Réductions')).toBeInTheDocument();
    fireEvent.change(reductions[1]!, { target: { value: '40 000' } });
    expect(screen.getAllByText('La réduction doit être positive et inférieure au montant de la tranche.').length).toBeGreaterThan(0);
  });

  it('compare « rembourser » et « investir » quand il y a des remboursements anticipés', () => {
    renderWithStore(<Scenarios />);
    expect(screen.queryByText('Rembourser ou investir ?')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Récurrent' }));
    expect(screen.getByText('Rembourser ou investir ?')).toBeInTheDocument();
    // Placement à 3 % < coût du crédit : rembourser l'emporte.
    expect(screen.getByText('Avantage : rembourser')).toBeInTheDocument();
  });
});
