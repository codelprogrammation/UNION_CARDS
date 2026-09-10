/**
 * Helper utility to adapt professional job titles dynamically based on configured gender.
 * Supports French professional hierarchy norms (e.g. Directeur / Directrice).
 */
export function getGenderAwarePosition(position: string, gender?: 'M' | 'F' | 'O' | string): string {
  if (!position) return '';
  const g = (gender || 'F').toUpperCase();

  // If gender is female ('F')
  if (g === 'F') {
    return position
      .replace(/\bDirecteur Général\b/g, 'Directrice Générale')
      .replace(/\bDirecteur\b/g, 'Directrice')
      .replace(/\bDirecteur de\b/g, 'Directrice de')
      .replace(/\bDirecteur des\b/g, 'Directrice des')
      .replace(/\bChef de Corps\b/g, 'Cheffe de Corps')
      .replace(/\bChef de Projet\b/g, 'Cheffe de Projet')
      .replace(/\bChef de Service\b/g, 'Cheffe de Service')
      .replace(/\bChef\b/g, 'Cheffe')
      .replace(/\bIngénieur\b/g, 'Ingénieure')
      .replace(/\bInspecteur\b/g, 'Inspectrice')
      .replace(/\bConducteur\b/g, 'Conductrice')
      .replace(/\bAuditeur\b/g, 'Auditrice')
      .replace(/\bCoordinateur\b/g, 'Coordinatrice')
      .replace(/\bSuperviseur\b/g, 'Superviseuse')
      .replace(/\bConseiller\b/g, 'Conseillère')
      .replace(/\bCollaborateur\b/g, 'Collaboratrice')
      .replace(/\bAdministrateur\b/g, 'Administratrice')
      .replace(/\bTechnicien\b/g, 'Technicienne')
      .replace(/\bFormatrice\b/g, 'Formatrice')
      .replace(/\bFormateur\b/g, 'Formatrice')
      .replace(/\bDocteur\b/g, 'Docteure')
      .replace(/\bCadre Dirigeant\b/g, 'Cadre Dirigeante');
  }

  // If gender is male ('M')
  if (g === 'M') {
    return position
      .replace(/\bDirectrice Générale\b/g, 'Directeur Général')
      .replace(/\bDirectrice\b/g, 'Directeur')
      .replace(/\bDirectrice de\b/g, 'Directeur de')
      .replace(/\bDirectrice des\b/g, 'Directeur des')
      .replace(/\bCheffe de Corps\b/g, 'Chef de Corps')
      .replace(/\bCheffe de Projet\b/g, 'Chef de Projet')
      .replace(/\bCheffe de Service\b/g, 'Chef de Service')
      .replace(/\bCheffe\b/g, 'Chef')
      .replace(/\bIngénieure\b/g, 'Ingénieur')
      .replace(/\bInspectrice\b/g, 'Inspecteur')
      .replace(/\bConductrice\b/g, 'Conducteur')
      .replace(/\bAuditrice\b/g, 'Auditeur')
      .replace(/\bCoordinatrice\b/g, 'Coordinateur')
      .replace(/\bSuperviseuse\b/g, 'Superviseur')
      .replace(/\bConseillère\b/g, 'Conseiller')
      .replace(/\bCollaboratrice\b/g, 'Collaborateur')
      .replace(/\bAdministratrice\b/g, 'Administrateur')
      .replace(/\bTechnicienne\b/g, 'Technicien')
      .replace(/\bFormatrice\b/g, 'Formateur')
      .replace(/\bDocteure\b/g, 'Docteur')
      .replace(/\bCadre Dirigeante\b/g, 'Cadre Dirigeant');
  }

  return position;
}
