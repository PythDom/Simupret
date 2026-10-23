import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.pythdom.simupret',
  appName: 'Simulateur de crédit',
  webDir: 'dist',
  android: {
    // Le contenu est servi localement ; aucune ressource distante n'est chargée.
    allowMixedContent: false,
  },
};

export default config;
