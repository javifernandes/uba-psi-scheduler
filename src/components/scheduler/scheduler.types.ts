export type Day = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

export type VenueCode = string;
export type EventType = 'prac' | 'teo' | 'sem';
export type SlotTipo = EventType;
export type SlotAssociationRole = 'teo' | 'sem' | `custom:${string}`;
export type SlotAssociationCondition = 'obligatorio' | 'opcional';

export type SlotAsociado = {
  slotId: string;
  rol: SlotAssociationRole;
  condicion: SlotAssociationCondition;
};

type BaseSlot = {
  id: string;
  tipo: SlotTipo;
  dia: Day;
  inicio: string;
  fin: string;
  profesor: string;
  aula: string;
  observ?: string;
};

export type Teorico = Omit<BaseSlot, 'tipo'> & { tipo: 'teo' };
export type Seminario = Omit<BaseSlot, 'tipo'> & { tipo: 'sem' };

export type Comision = Omit<BaseSlot, 'tipo'> & {
  tipo: 'prac';
  vacantes: number | null;
  slotsAsociados: SlotAsociado[];
};

export type SubjectSlot = Teorico | Seminario | Comision;

export type CalendarEvent = {
  tipo: EventType;
  id: string;
  dia: Day;
  inicio: string;
  fin: string;
  aula: string;
  title: string;
  linkedCommissionId?: string;
  linkedCommissionIds?: string[];
  linkedSlotId?: string;
  linkedSlotRole?: SlotAssociationRole;
  sourceSubjectId: string;
  sourceSubjectLabel: string;
  isExternal?: boolean;
};

export type SubjectData = {
  schemaVersion: 2;
  id: string;
  label: string;
  header: string;
  slots: SubjectSlot[];
};

export type ParsedSubject = {
  id: string;
  label: string;
  header: string;
  slots: SubjectSlot[];
  comisiones: Comision[];
  slotMap: Record<string, SubjectSlot>;
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
  slotKind: 'Comisión' | 'Teórico' | 'Seminario';
  slotCode: string;
  venue: string;
  day: Day;
  start: string;
  end: string;
  title?: string;
};
