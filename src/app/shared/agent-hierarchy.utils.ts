import { BaUserDto } from '../services/users.service';

/** Les comptes proviennent du référentiel actif ; le serveur contrôle à nouveau à l'enregistrement. */
export function agentHierarchyCandidates(form: BaUserDto, users: BaUserDto[], services: {id?:string;idDepartement?:string}[] = []) {
  const available = users.filter(u => !!u.id && u.id !== form.id && u.activated === true && u.locked !== true);
  const department = (u:BaUserDto) => u.idDepartement || services.find(s => s.id === u.idService)?.idDepartement;
  return {
    chiefs: form.idDepartement && form.idService ? available.filter(u =>
      u.fonction === 'CHEF_SERVICE' && department(u) === form.idDepartement && u.idService === form.idService) : [],
    directors: form.idDepartement ? available.filter(u => u.fonction === 'DIRECTEUR' && u.idDepartement === form.idDepartement) : []
  };
}

export function fillAgentHierarchy(form: BaUserDto, users: BaUserDto[], services: {id?:string;idDepartement?:string}[] = []): void {
  if (form.fonction !== 'AGENT') return;
  const {chiefs, directors} = agentHierarchyCandidates(form, users, services);
  const selected = [form.idSuperieur, form.idSuperieurSecondaire];
  const chief = chiefs.find(u => selected.includes(u.id)) || (chiefs.length === 1 ? chiefs[0] : undefined);
  const director = directors.find(u => selected.includes(u.id)) || (directors.length === 1 ? directors[0] : undefined);
  form.idSuperieur = chief?.id;
  form.nomCompletSuperieur = chief ? [chief.prenom, chief.nom].filter(Boolean).join(' ') : undefined;
  form.idSuperieurSecondaire = director?.id;
  form.nomCompletSuperieurSecondaire = director ? [director.prenom, director.nom].filter(Boolean).join(' ') : undefined;
}
