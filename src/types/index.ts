// ============================================
// TIPOS PRINCIPAIS - AONDE TA O ROLE
// ============================================

// Tipo de usuario no sistema
export type UserType = 'visitor' | 'common' | 'premium' | 'admin' | 'owner' | 'moderacao' | 'suporte' | 'financeiro';

// Status de presenca em um evento
export type PresenceStatus = 'interested' | 'going' | 'on_the_way' | 'arrived';

// Tipo de evento/festa (aceita tipos padrão ou string customizada)
export type EventType = 'private' | 'rave' | 'baile' | 'bar' | 'club' | 'house' | 'open_air' | 'other' | string;

// Classificacao de popularidade do evento
export type PopularityLevel = 'weak' | 'medium' | 'hot';

// ============================================
// INTERFACES
// ============================================

// Usuario do sistema
export interface User {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
  userType: UserType;
  phone?: string;
  createdAt: Date;
  isPremium: boolean;
  premiumExpiresAt?: Date;
  isAdmin?: boolean; // Indica se o usuário é administrador
  emailConfirmed?: boolean; // Indica se o email está confirmado
}

// Coordenadas geograficas
export interface Coordinates {
  lat: number;
  lng: number;
}

// Evento/Festa
export interface Event {
  id: string;
  name: string;
  description?: string;
  address: string;
  coordinates: Coordinates;
  maxCapacity: number;
  currentAttendees: number;
  ageRange: {
    min: number;
    max?: number;
  };
  eventType: EventType;
  coverImage: string;
  isFree: boolean;
  price?: number; // Preco unico (para compatibilidade com eventos antigos)
  ticketCategories?: TicketCategory[]; // Categorias de ingressos
  boosts: number;
  organizerId: string;
  organizerName: string;
  isPremiumOrganizer: boolean;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isApproved: boolean;
  views: number;
  interestedCount: number;
  goingCount: number;
  onTheWayCount: number;
  guestList?: GuestListEntry[];
}

// Categoria de ingresso
export interface TicketCategory {
  id: string;
  name: string;
  price: number;
  stockTotal: number;
  stockRemaining: number;
  description?: string;
}

// Entrada na lista de convidados (premium)
export interface GuestListEntry {
  id: string;
  eventId: string;
  userId?: string;
  name: string;
  phone?: string;
  email?: string;
  status: 'pending' | 'confirmed' | 'checked_in' | 'cancelled';
  addedAt: Date;
  confirmedAt?: Date;
  checkedInAt?: Date;
}

// Interacao usuario-evento
export interface UserEventInteraction {
  id: string;
  eventId: string;
  userId: string;
  status: PresenceStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Transacao de boost
export interface BoostTransaction {
  id: string;
  eventId: string;
  userId: string;
  amount: number;
  totalPrice: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  paymentMethod?: string;
}

// Denuncia de evento
export interface EventReport {
  id: string;
  eventId: string;
  reporterId: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: Date;
}

// Estatisticas do evento (dashboard premium)
export interface EventStats {
  eventId: string;
  totalViews: number;
  uniqueViews: number;
  interestedCount: number;
  goingCount: number;
  onTheWayCount: number;
  arrivedCount: number;
  boostCount: number;
  guestListCount: number;
  checkedInCount: number;
  peakOnlineViewers: number;
  viewsByHour: { hour: string; count: number }[];
}

// Filtros de busca de eventos
export interface EventFilters {
  ageMin?: number;
  ageMax?: number;
  eventType?: EventType[];
  isFree?: boolean;
  priceMin?: number;
  priceMax?: number;
  distance?: number;
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery?: string;
}

// Configuracoes do usuario
export interface UserSettings {
  userId: string;
  notifications: {
    newEvents: boolean;
    eventReminders: boolean;
    boostUpdates: boolean;
  };
  privacy: {
    showOnTheWay: boolean;
    showOnGuestList: boolean;
  };
  locationSharing: boolean;
}

// ============================================
// FUNCOES AUXILIARES
// ============================================

// Determina nivel de popularidade baseado em participantes
export function getPopularityLevel(attendees: number): PopularityLevel {
  if (attendees >= 100) return 'hot';
  if (attendees >= 30) return 'medium';
  return 'weak';
}

// Retorna label de popularidade
export function getPopularityLabel(level: PopularityLevel): string {
  const labels = {
    hot: 'Bombando',
    medium: 'Mediano',
    weak: 'Fraco',
  };
  return labels[level];
}

// Formata preco de boost
export function formatBoostPrice(boosts: number): string {
  const price = boosts * 0.20;
  return `R$ ${price.toFixed(2).replace('.', ',')}`;
}

// Calcula preco total de boosts
export function calculateBoostPrice(boosts: number): number {
  return boosts * 0.20;
}

// Formata faixa etaria
export function formatAgeRange(min: number, max?: number): string {
  if (max) {
    return `${min} a ${max} anos`;
  }
  return `+${min}`;
}

// Retorna label do tipo de evento
export function getEventTypeLabel(type: EventType): string {
  const labels: Record<string, string> = {
    private: 'Festa Privada',
    rave: 'Rave',
    baile: 'Baile',
    bar: 'Bar',
    club: 'Balada',
    house: 'House Party',
    open_air: 'Ao Ar Livre',
    other: 'Outro',
  };
  // Se for um tipo padrão, retorna o label correspondente
  if (labels[type]) {
    return labels[type];
  }
  // Se for um tipo customizado, retorna o próprio valor (capitalizado)
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

// Verifica se evento pode ser editado (ate 1h antes)
export function canEditEvent(startDate: Date): boolean {
  const now = new Date();
  const oneHourBefore = new Date(startDate.getTime() - 60 * 60 * 1000);
  return now < oneHourBefore;
}

// Verifica se evento esta lotado
export function isEventFull(current: number, max: number): boolean {
  return current >= max;
}
