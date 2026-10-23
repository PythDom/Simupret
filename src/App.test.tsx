import { render, screen } from '@testing-library/react';
import App from './App';
import { screenFromHash } from './screens/registry';

describe('App', () => {
  it('affiche le titre et la navigation en français', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Simulateur de crédit hypothécaire' })).toBeInTheDocument();
    for (const label of ['Paramètres', 'Scénarios', 'Comparateur', 'Optimiseur', 'À propos']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('résout les écrans depuis le hash', () => {
    expect(screenFromHash('#/optimiseur')).toBe('optimiseur');
    expect(screenFromHash('')).toBe('parametres');
    expect(screenFromHash('#/inconnu')).toBe('parametres');
  });
});
