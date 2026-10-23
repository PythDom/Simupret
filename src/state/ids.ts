let counter = 0;

/** Identifiant court et unique (sans dépendre de crypto.randomUUID). */
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
