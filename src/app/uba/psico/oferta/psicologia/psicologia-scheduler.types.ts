export type Day = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

export type VenueCode = 'IN' | 'SI' | 'HY' | 'OTRO';
export type EventType = 'prac' | 'teo' | 'sem';

type BaseSlot = {
  id: string;
  dia: Day;
  inicio: string;
  fin: string;
  profesor: string;
  aula: string;
  observ: string;
};

export type Teorico = BaseSlot;
export type Seminario = BaseSlot;

export type Comision = BaseSlot & {
  oblig: string;
  teoricoId: string;
  seminarioId: string;
};

export type CalendarEvent = {
  tipo: EventType;
  id: string;
  dia: Day;
  inicio: string;
  fin: string;
  aula: string;
  title: string;
  linkedCommissionId?: string;
  linkedTeoricoId?: string;
  linkedSeminarioId?: string;
  sourceSubjectId: string;
  sourceSubjectLabel: string;
  isExternal?: boolean;
};

export type SubjectData = {
  id: string;
  label: string;
  header: string;
  teoricos: string[];
  seminarios: string[];
  comisiones: string[];
};

export type ParsedSubject = {
  id: string;
  label: string;
  header: string;
  teoricos: Teorico[];
  seminarios: Seminario[];
  comisiones: Comision[];
  teoricoMap: Record<string, Teorico>;
  seminarioMap: Record<string, Seminario>;
};

export type SavedElectionDetail = {
  subject: SubjectData;
  commission: Comision;
  teorico?: Teorico;
  seminario?: Seminario;
};

export type ReservedSlot = {
  slotId: string;
  subjectId: string;
  subjectLabel: string;
  day: Day;
  start: string;
  end: string;
  title: string;
};
