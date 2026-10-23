import { useStore } from '../state/context';
import { SelectField } from './fields';

/** Choix du scénario actif (partagé entre les écrans). */
export function ScenarioPicker() {
  const { state, dispatch } = useStore();
  if (state.scenarios.length === 0) return null;
  return (
    <SelectField
      label="Scénario"
      value={state.selectedScenarioId ?? state.scenarios[0]!.id}
      options={state.scenarios.map((s) => ({ value: s.id, label: s.name }))}
      onChange={(id) => dispatch({ type: 'scenario/select', id })}
    />
  );
}
