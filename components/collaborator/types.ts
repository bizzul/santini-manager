// Tipi condivisi dell'area collaboratore. Estratti dalla page
// area-collaboratore (che li re-esporta per retrocompatibilità) così i
// componenti riusabili non dipendono da una route.

export interface AssignedTaskOption {
  uniqueCode: string;
  label: string;
}

export interface CollaboratorRoleOption {
  id: number;
  name: string;
}
