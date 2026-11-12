export function directoryText(value: string | undefined | null): string {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim();
}

export function directoryMatches(values: (string | undefined | null)[], query: string): boolean {
  const text = directoryText(values.filter(Boolean).join(' '));
  return directoryText(query).split(/\s+/).filter(Boolean).every(word =>
    text.includes(word) || (/^\+?[\d().-]+$/.test(word) && /\d/.test(word) && values.some(value =>
      (value || '').replace(/\D/g, '').includes(word.replace(/\D/g, '')))));
}

export function directoryFunction(value?: string): string {
  const labels: Record<string, string> = {
    AGENT: 'Agent', CHEF_SERVICE: 'Chef de service', DIRECTEUR: 'Directeur de département',
    DIRECTEUR_GENERAL_ADJOINT: 'Directeur général adjoint', DIRECTEUR_GENERAL: 'Directeur général'
  };
  return labels[value || ''] || value?.replace(/_/g, ' ') || 'Fonction non renseignée';
}

export function directoryInitials(first?: string, last?: string): string {
  return `${first?.trim().charAt(0) || ''}${last?.trim().charAt(0) || ''}`.toLocaleUpperCase('fr') || '?';
}

export function directoryTelephone(value?: string): string | null {
  if (!value || !/^[+\d\s().-]+$/.test(value) || !/\d/.test(value)) return null;
  return `tel:${value.replace(/[\s().-]/g, '')}`;
}

export function directoryEmail(value?: string): string | null {
  return value && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value) ? `mailto:${value}` : null;
}
