import { directoryMatches, directoryEmail, directoryTelephone, directoryFunction } from './directory.utils';
describe('Directory utilities',()=>{
  it('recherche sur les mots, accents et numéros formatés',()=>{expect(directoryMatches(['Émile Bakouan','Support'],'bakouan emile')).toBeTrue();expect(directoryMatches(['+226 70 00 11 22'],'70001122')).toBeTrue();expect(directoryMatches(['Support'],'audit')).toBeFalse();expect(directoryMatches(['Support'],'.')).toBeFalse();});
  it('construit seulement des liens de contact valables',()=>{expect(directoryEmail('agent@bsic.bf')).toBe('mailto:agent@bsic.bf');expect(directoryEmail('javascript:alert(1)')).toBeNull();expect(directoryEmail('a@bsic.bf\nBcc:x@y.com')).toBeNull();expect(directoryTelephone('+226 70 00 11 22')).toBe('tel:+22670001122');expect(directoryTelephone('javascript:alert(1)')).toBeNull();});
  it('affiche la fonction organisationnelle sans déduire une fonction du rôle ADMIN',()=>{expect(directoryFunction('CHEF_SERVICE')).toBe('Chef de service');expect(directoryFunction('BA_ADMIN')).toBe('BA ADMIN');expect(directoryFunction()).toBe('Fonction non renseignée');});
});
