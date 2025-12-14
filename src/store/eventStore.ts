// ============================================
// EVENT STORE - Gerenciamento de Eventos
// ============================================

import { create } from 'zustand';
import { Event, EventFilters, EventType, GuestListEntry, Coordinates, TicketCategory } from '@/types';
import { supabase } from '@/lib/supabase';
import { supabaseEventToEvent, eventToSupabaseEvent } from '@/lib/supabase-helpers';

interface EventState {
  events: Event[];
  filteredEvents: Event[];
  selectedEvent: Event | null;
  filters: EventFilters;
  isLoading: boolean;
  userLocation: Coordinates | null;
  
  // Actions
  fetchEvents: () => Promise<void>;
  getEventById: (id: string) => Promise<Event | undefined>;
  createEvent: (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'interestedCount' | 'goingCount' | 'onTheWayCount'>) => Promise<Event>;
  updateEvent: (id: string, updates: Partial<Event>, userId?: string, isAdmin?: boolean) => Promise<void>;
  deleteEvent: (id: string, userId?: string, isAdmin?: boolean) => Promise<void>;
  deleteMultipleEvents: (ids: string[], userId?: string, isAdmin?: boolean) => Promise<void>;
  selectEvent: (event: Event | null) => void;
  setFilters: (filters: EventFilters) => void;
  clearFilters: () => void;
  applyFilters: () => void;
  addBoost: (eventId: string, amount: number) => Promise<void>;
  incrementView: (eventId: string, userId: string) => Promise<void>;
  markInterested: (eventId: string, userId?: string) => Promise<void>;
  unmarkInterested: (eventId: string, userId?: string) => Promise<void>;
  checkUserInterested: (eventId: string, userId?: string) => Promise<boolean>;
  markGoing: (eventId: string, userId?: string) => Promise<void>;
  unmarkGoing: (eventId: string, userId?: string) => Promise<void>;
  checkUserGoing: (eventId: string, userId?: string) => Promise<boolean>;
  markOnTheWay: (eventId: string, userId?: string) => Promise<void>;
  unmarkOnTheWay: (eventId: string, userId?: string) => Promise<void>;
  checkUserOnTheWay: (eventId: string, userId?: string) => Promise<boolean>;
  addToGuestList: (eventId: string, entry: Omit<GuestListEntry, 'id' | 'addedAt'>) => void;
  removeFromGuestList: (eventId: string, entryId: string) => void;
  updateGuestStatus: (eventId: string, entryId: string, status: GuestListEntry['status']) => void;
  setUserLocation: (coords: Coordinates | null) => void;
  reportEvent: (eventId: string, reason: string) => Promise<void>;
  purchaseTicketCategory: (eventId: string, categoryId: string) => Promise<void>;
  updateTicketCategory: (eventId: string, categoryId: string, updates: Partial<TicketCategory>) => Promise<void>;
}

// Dados mock de eventos para demonstracao
const mockEvents: Event[] = [
  {
    id: 'event_1',
    name: 'Rave Underground SP',
    description: 'A maior rave underground de Sao Paulo. Line-up internacional com os melhores DJs de techno.',
    address: 'Rua Augusta, 1500 - Consolacao, Sao Paulo',
    coordinates: { lat: -23.5505, lng: -46.6333 },
    maxCapacity: 500,
    currentAttendees: 145,
    ageRange: { min: 18 },
    eventType: 'rave',
    coverImage: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=800',
    isFree: false,
    price: 80,
    boosts: 250,
    organizerId: 'user_premium_1',
    organizerName: 'Organizador Premium',
    isPremiumOrganizer: true,
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isApproved: true,
    views: 1250,
    interestedCount: 320,
    goingCount: 145,
    onTheWayCount: 28,
    guestList: [],
  },
  {
    id: 'event_2',
    name: 'Baile do Beco',
    description: 'O tradicional baile funk que agita a zona sul. Entrada gratuita ate meia-noite.',
    address: 'Rua dos Pinheiros, 800 - Pinheiros, Sao Paulo',
    coordinates: { lat: -23.5629, lng: -46.6896 },
    maxCapacity: 300,
    currentAttendees: 89,
    ageRange: { min: 18, max: 35 },
    eventType: 'baile',
    coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    isFree: true,
    boosts: 180,
    organizerId: 'user_2',
    organizerName: 'DJ Malvadao',
    isPremiumOrganizer: false,
    startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isApproved: true,
    views: 890,
    interestedCount: 210,
    goingCount: 89,
    onTheWayCount: 15,
  },
  {
    id: 'event_3',
    name: 'House Party VIP',
    description: 'Festa exclusiva em cobertura com vista para a cidade. Dress code obrigatorio.',
    address: 'Av. Brigadeiro Faria Lima, 3000 - Itaim Bibi, Sao Paulo',
    coordinates: { lat: -23.5868, lng: -46.6822 },
    maxCapacity: 80,
    currentAttendees: 45,
    ageRange: { min: 21, max: 40 },
    eventType: 'house',
    coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    isFree: false,
    price: 150,
    boosts: 320,
    organizerId: 'user_premium_1',
    organizerName: 'Organizador Premium',
    isPremiumOrganizer: true,
    startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isApproved: true,
    views: 650,
    interestedCount: 180,
    goingCount: 45,
    onTheWayCount: 8,
    guestList: [
      {
        id: 'guest_1',
        eventId: 'event_3',
        name: 'Maria Silva',
        phone: '11999999999',
        status: 'confirmed',
        addedAt: new Date(),
        confirmedAt: new Date(),
      },
      {
        id: 'guest_2',
        eventId: 'event_3',
        name: 'Joao Santos',
        email: 'joao@email.com',
        status: 'pending',
        addedAt: new Date(),
      },
    ],
  },
  {
    id: 'event_4',
    name: 'Sunset Open Air',
    description: 'Festival ao ar livre com musica eletronica e food trucks. Traz sua galera!',
    address: 'Parque Villa-Lobos - Alto de Pinheiros, Sao Paulo',
    coordinates: { lat: -23.5469, lng: -46.7231 },
    maxCapacity: 1000,
    currentAttendees: 456,
    ageRange: { min: 16 },
    eventType: 'open_air',
    coverImage: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800',
    isFree: false,
    price: 60,
    boosts: 450,
    organizerId: 'user_3',
    organizerName: 'Sunset Events',
    isPremiumOrganizer: true,
    startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isApproved: true,
    views: 2100,
    interestedCount: 890,
    goingCount: 456,
    onTheWayCount: 45,
  },
  {
    id: 'event_5',
    name: 'Bar do Zeca - Quinta Live',
    description: 'Quinta-feira com musica ao vivo. Sertanejo e pagode a noite toda.',
    address: 'Rua Oscar Freire, 200 - Jardins, Sao Paulo',
    coordinates: { lat: -23.5618, lng: -46.6691 },
    maxCapacity: 150,
    currentAttendees: 23,
    ageRange: { min: 18 },
    eventType: 'bar',
    coverImage: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800',
    isFree: true,
    boosts: 45,
    organizerId: 'user_4',
    organizerName: 'Bar do Zeca',
    isPremiumOrganizer: false,
    startDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isApproved: true,
    views: 320,
    interestedCount: 78,
    goingCount: 23,
    onTheWayCount: 5,
  },
  {
    id: 'event_6',
    name: 'Club Night Premium',
    description: 'A balada mais exclusiva da cidade. Reservas antecipadas recomendadas.',
    address: 'Rua Haddock Lobo, 1500 - Cerqueira Cesar, Sao Paulo',
    coordinates: { lat: -23.5589, lng: -46.6649 },
    maxCapacity: 400,
    currentAttendees: 198,
    ageRange: { min: 21 },
    eventType: 'club',
    coverImage: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800',
    isFree: false,
    price: 120,
    boosts: 380,
    organizerId: 'user_premium_1',
    organizerName: 'Organizador Premium',
    isPremiumOrganizer: true,
    startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isApproved: true,
    views: 1800,
    interestedCount: 520,
    goingCount: 198,
    onTheWayCount: 32,
    guestList: [],
  },
  {
    id: 'event_7',
    name: 'Festival Eletrônico SP',
    description: 'O maior festival de música eletrônica de São Paulo. 3 palcos, 20 DJs internacionais e muito mais!',
    address: 'Autódromo de Interlagos - Interlagos, São Paulo',
    coordinates: { lat: -23.7036, lng: -46.6997 },
    maxCapacity: 5000,
    currentAttendees: 2340,
    ageRange: { min: 18 },
    eventType: 'open_air',
    coverImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
    isFree: false,
    ticketCategories: [
      {
        id: 'cat_pista_7',
        name: 'Pista',
        price: 80,
        stockTotal: 3000,
        stockRemaining: 1200,
        description: 'Acesso à área da pista principal',
      },
      {
        id: 'cat_camarote_7',
        name: 'Camarote',
        price: 250,
        stockTotal: 200,
        stockRemaining: 45,
        description: 'Acesso exclusivo ao camarote com open bar e vista privilegiada',
      },
      {
        id: 'cat_vip_7',
        name: 'Área VIP',
        price: 150,
        stockTotal: 500,
        stockRemaining: 180,
        description: 'Acesso à área VIP com bar exclusivo e banheiros privativos',
      },
    ],
    boosts: 850,
    organizerId: 'user_premium_1',
    organizerName: 'Festival Events',
    isPremiumOrganizer: true,
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isApproved: true,
    views: 5600,
    interestedCount: 3200,
    goingCount: 2340,
    onTheWayCount: 120,
    guestList: [],
  },
  {
    id: 'event_8',
    name: 'Show de Rock Nacional',
    description: 'Noite especial com as maiores bandas de rock nacional. Line-up imperdível!',
    address: 'Allianz Parque - Barra Funda, São Paulo',
    coordinates: { lat: -23.5275, lng: -46.6781 },
    maxCapacity: 2000,
    currentAttendees: 890,
    ageRange: { min: 16 },
    eventType: 'other',
    coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    isFree: false,
    ticketCategories: [
      {
        id: 'cat_pista_8',
        name: 'Pista',
        price: 100,
        stockTotal: 1500,
        stockRemaining: 650,
        description: 'Acesso à pista do show',
      },
      {
        id: 'cat_camarote_8',
        name: 'Camarote',
        price: 300,
        stockTotal: 100,
        stockRemaining: 12,
        description: 'Camarote premium com open bar, buffet e vista privilegiada do palco',
      },
      {
        id: 'cat_vip_8',
        name: 'Área VIP',
        price: 180,
        stockTotal: 400,
        stockRemaining: 228,
        description: 'Área VIP com acesso a bar exclusivo e banheiros',
      },
    ],
    boosts: 620,
    organizerId: 'user_premium_1',
    organizerName: 'Rock Productions',
    isPremiumOrganizer: true,
    startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isApproved: true,
    views: 4200,
    interestedCount: 2100,
    goingCount: 890,
    onTheWayCount: 45,
    guestList: [],
  },
  {
    id: 'event_9',
    name: 'Festa Sertaneja Premium',
    description: 'A maior festa sertaneja da região. Música ao vivo, pista de dança e muito forró!',
    address: 'Espaço de Eventos - Vila Olímpia, São Paulo',
    coordinates: { lat: -23.5925, lng: -46.6876 },
    maxCapacity: 800,
    currentAttendees: 320,
    ageRange: { min: 18 },
    eventType: 'other',
    coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
    isFree: false,
    ticketCategories: [
      {
        id: 'cat_pista_9',
        name: 'Pista',
        price: 60,
        stockTotal: 500,
        stockRemaining: 200,
        description: 'Acesso à pista de dança',
      },
      {
        id: 'cat_camarote_9',
        name: 'Camarote',
        price: 200,
        stockTotal: 50,
        stockRemaining: 8,
        description: 'Camarote exclusivo com open bar e buffet completo',
      },
      {
        id: 'cat_vip_9',
        name: 'Área VIP',
        price: 120,
        stockTotal: 250,
        stockRemaining: 112,
        description: 'Área VIP com bar exclusivo e mesas reservadas',
      },
    ],
    boosts: 480,
    organizerId: 'user_5',
    organizerName: 'Sertanejo Events',
    isPremiumOrganizer: true,
    startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isApproved: true,
    views: 2800,
    interestedCount: 1200,
    goingCount: 320,
    onTheWayCount: 28,
    guestList: [],
  },
  {
    id: 'event_10',
    name: 'Rave Techno Underground',
    description: 'Rave underground com os melhores DJs de techno do Brasil. Som pesado e visual incrível!',
    address: 'Galpão Industrial - Mooca, São Paulo',
    coordinates: { lat: -23.5431, lng: -46.6292 },
    maxCapacity: 1500,
    currentAttendees: 780,
    ageRange: { min: 18 },
    eventType: 'rave',
    coverImage: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=800',
    isFree: false,
    ticketCategories: [
      {
        id: 'cat_pista_10',
        name: 'Pista',
        price: 70,
        stockTotal: 1200,
        stockRemaining: 450,
        description: 'Acesso à pista principal',
      },
      {
        id: 'cat_camarote_10',
        name: 'Camarote',
        price: 180,
        stockTotal: 80,
        stockRemaining: 15,
        description: 'Camarote com open bar, área lounge e vista privilegiada',
      },
      {
        id: 'cat_vip_10',
        name: 'Área VIP',
        price: 120,
        stockTotal: 220,
        stockRemaining: 95,
        description: 'Área VIP com bar exclusivo e banheiros privativos',
      },
    ],
    boosts: 650,
    organizerId: 'user_premium_1',
    organizerName: 'Techno Underground',
    isPremiumOrganizer: true,
    startDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isApproved: true,
    views: 3800,
    interestedCount: 1900,
    goingCount: 780,
    onTheWayCount: 65,
    guestList: [],
  },
];

// ============================================
// NOTA: localStorage foi removido completamente
// ============================================
// Todo o armazenamento agora é feito APENAS no Supabase
// Se o Supabase não estiver configurado, as operações falharão
// Isso evita conflitos entre localStorage e Supabase

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  filteredEvents: [],
  selectedEvent: null,
  filters: {},
  isLoading: false,
  userLocation: null,

  // Busca todos os eventos
  fetchEvents: async () => {
    set({ isLoading: true });
    
    try {
      // Tenta usar Supabase se estiver configurado
      if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        console.log('📡 [EventStore] Fazendo requisição ao Supabase para buscar eventos...');
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('is_active', true)
          .eq('is_approved', true)
          .order('boosts', { ascending: false });

        if (error) {
          console.error('❌ [EventStore] Erro ao buscar eventos do Supabase:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }

        if (data && data.length > 0) {
          console.log(`✅ [EventStore] ${data.length} evento(s) encontrado(s) no Supabase`);
          const events = data.map(supabaseEventToEvent);
          set({
            events,
            filteredEvents: events,
            isLoading: false,
          });
          console.log('✅ [EventStore] Eventos carregados no estado local');
          return;
        } else {
          console.log('ℹ️ [EventStore] Nenhum evento encontrado no Supabase');
          // Se não há eventos no Supabase, retorna array vazio
          set({
            events: [],
            filteredEvents: [],
            isLoading: false,
          });
          return;
        }
      } else {
        // Supabase não configurado
        console.error('❌ Supabase não está configurado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
        set({
          events: [],
          filteredEvents: [],
          isLoading: false,
        });
        return;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar eventos do Supabase:', error);
      set({
        events: [],
        filteredEvents: [],
        isLoading: false,
      });
    }
  },

  // Busca evento por ID
  getEventById: async (id: string) => {
    console.log('🔍 [EventStore] Buscando evento por ID:', id);
    
    // Primeiro tenta encontrar no estado local
    const localEvent = get().events.find((e) => e.id === id);
    if (localEvent) {
      console.log('✅ [EventStore] Evento encontrado no cache local:', localEvent.name);
      return localEvent;
    }

    console.log('📡 [EventStore] Evento não encontrado no cache, buscando no Supabase...');

    // Se não encontrar, tenta buscar no Supabase
    try {
      if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('❌ [EventStore] Erro ao buscar evento no Supabase:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          return undefined;
        }

        if (data) {
          console.log('✅ [EventStore] Evento encontrado no Supabase:', { id: data.id, name: data.name });
          const event = supabaseEventToEvent(data);
          
          // Adiciona ao estado local para cache
          set((state) => {
            // Evita duplicatas
            const existingIndex = state.events.findIndex(e => e.id === event.id);
            if (existingIndex >= 0) {
              const updatedEvents = [...state.events];
              updatedEvents[existingIndex] = event;
              return { events: updatedEvents };
            }
            return { events: [...state.events, event] };
          });
          return event;
        } else {
        }
      } else {
      }
    } catch (error) {
      console.error('❌ Erro ao buscar evento no Supabase:', error);
    }

    // Se não encontrar em nenhum lugar, retorna undefined
    return undefined;
  },

  // Cria novo evento
  createEvent: async (eventData) => {
    console.log('🚀 [EventStore] Criando novo evento:', {
      name: eventData.name,
      organizerId: eventData.organizerId,
      address: eventData.address,
      coordinates: eventData.coordinates,
      startDate: eventData.startDate,
    });
    set({ isLoading: true });

    try {
      // Tenta usar Supabase se estiver configurado
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabase && supabaseUrl && supabaseUrl !== '') {
        console.log('📡 [EventStore] Convertendo evento para formato Supabase...');
        const supabaseData = eventToSupabaseEvent(eventData);
        console.log('📦 [EventStore] Dados convertidos:', {
          name: supabaseData.name,
          organizer_id: supabaseData.organizer_id,
          has_coordinates: !!supabaseData.coordinates,
        });
        
        console.log('📤 [EventStore] Enviando evento para Supabase...');
        const { data, error } = await supabase
          .from('events')
          .insert(supabaseData)
          .select()
          .single();

        if (error) {
          console.error('❌ [EventStore] Erro ao criar evento no Supabase:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          
          throw error;
        }

        if (data) {
          console.log('✅ [EventStore] Evento criado no Supabase:', { id: data.id, name: data.name });
          const newEvent = supabaseEventToEvent(data);
          
          set((state) => {
            const updatedEvents = [newEvent, ...state.events];
            return {
              events: updatedEvents,
              filteredEvents: updatedEvents,
              isLoading: false,
            };
          });

          // Reaplica filtros se houver filtros ativos
          const { filters } = get();
          if (Object.keys(filters).length > 0) {
            get().applyFilters();
          }

          return newEvent;
        } else {
          throw new Error('Evento criado mas nenhum dado retornado');
        }
      } else {
        set({ isLoading: false });
        throw new Error('Supabase não está configurado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
      }
    } catch (error) {
      set({ isLoading: false });
      console.error('❌ Erro ao criar evento:', error);
      throw error;
    }
  },

  // Atualiza evento
  updateEvent: async (id: string, updates: Partial<Event>, userId?: string, isAdmin?: boolean) => {
    console.log('✏️ [EventStore] Atualizando evento:', { id, userId, isAdmin, updates: Object.keys(updates) });
    set({ isLoading: true });

    try {
      // Tenta usar Supabase se estiver configurado
      if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const event = get().events.find((e) => e.id === id);
        if (!event) {
          console.error('❌ [EventStore] Evento não encontrado para atualização:', id);
          throw new Error('Evento nao encontrado');
        }

        console.log('🔍 [EventStore] Evento encontrado:', { id: event.id, organizerId: event.organizerId });

        // Verifica permissão: admin pode editar qualquer evento, usuário comum só os seus
        if (userId && !isAdmin && event.organizerId !== userId) {
          console.warn('⚠️ [EventStore] Usuário sem permissão para editar:', { userId, organizerId: event.organizerId, isAdmin });
          throw new Error('Você não tem permissão para editar este evento');
        }

        console.log('✅ [EventStore] Permissão de edição confirmada');
        const updatedEvent = { ...event, ...updates, updatedAt: new Date() };
        const supabaseData = eventToSupabaseEvent(updatedEvent);

        console.log('📤 [EventStore] Enviando atualização para Supabase...');
        const { data, error } = await supabase
          .from('events')
          .update(supabaseData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('❌ [EventStore] Erro ao atualizar evento no Supabase:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }

        if (data) {
          console.log('✅ [EventStore] Evento atualizado no Supabase:', { id: data.id, name: data.name });
          const updated = supabaseEventToEvent(data);
          set((state) => {
            const updatedEvents = state.events.map((e) => (e.id === id ? updated : e));
            const updatedFilteredEvents = state.filteredEvents.map((e) => (e.id === id ? updated : e));

            return {
              events: updatedEvents,
              filteredEvents: updatedFilteredEvents,
              selectedEvent:
                state.selectedEvent?.id === id ? updated : state.selectedEvent,
              isLoading: false,
            };
          });
          console.log('✅ [EventStore] Estado local atualizado');
          return;
        } else {
          console.error('❌ [EventStore] Evento atualizado mas nenhum dado retornado');
          throw new Error('Evento atualizado mas nenhum dado retornado');
        }
      } else {
        set({ isLoading: false });
        throw new Error('Supabase não está configurado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
      }
    } catch (error) {
      set({ isLoading: false });
      console.error('❌ Erro ao atualizar evento:', error);
      throw error;
    }
  },

  // Deleta evento
  deleteEvent: async (id: string, userId?: string, isAdmin?: boolean) => {
    console.log('🗑️ [EventStore] Deletando evento:', { id, userId, isAdmin });
    set({ isLoading: true });

    try {
      // Tenta usar Supabase se estiver configurado
      if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        // Busca o evento para verificar permissões
        const event = get().events.find((e) => e.id === id);
        if (!event) {
          console.error('❌ [EventStore] Evento não encontrado para deleção:', id);
          throw new Error('Evento não encontrado');
        }

        console.log('🔍 [EventStore] Evento encontrado:', { id: event.id, organizerId: event.organizerId });

        // Verifica permissão: admin pode deletar qualquer evento, usuário comum só os seus
        if (!isAdmin && event.organizerId !== userId) {
          console.warn('⚠️ [EventStore] Usuário sem permissão para deletar:', { userId, organizerId: event.organizerId, isAdmin });
          throw new Error('Você não tem permissão para deletar este evento');
        }

        console.log('✅ [EventStore] Permissão de deleção confirmada');

        // Verifica se o ID é UUID válido antes de tentar deletar do Supabase
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        
        if (isUUID) {
          console.log('📤 [EventStore] Enviando requisição de deleção para Supabase...');
          // Deleta do Supabase apenas se for UUID válido
          const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', id);

          if (error) {
            console.error('❌ [EventStore] Erro ao deletar evento no Supabase:', {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
            });
            throw error;
          }

          console.log('✅ [EventStore] Evento deletado do Supabase com sucesso');
        } else {
          console.warn('⚠️ [EventStore] ID não é UUID válido, pulando deleção no Supabase:', id);
        }
      }
    } catch (error) {
      // Ignora erros de UUID inválido (festas antigas que não estão no Supabase)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('invalid input syntax for type uuid')) {
        console.warn('⚠️ [EventStore] Erro de UUID inválido ignorado (evento antigo)');
      } else {
        console.error('❌ [EventStore] Erro ao deletar evento do Supabase:', error);
        throw error;
      }
    }

    // Remove do estado
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
      filteredEvents: state.filteredEvents.filter((e) => e.id !== id),
      selectedEvent: state.selectedEvent?.id === id ? null : state.selectedEvent,
      isLoading: false,
    }));
  },

  // Deleta múltiplos eventos (para admin)
  deleteMultipleEvents: async (ids: string[], userId?: string, isAdmin?: boolean) => {
    if (!isAdmin) {
      throw new Error('Apenas administradores podem deletar múltiplos eventos');
    }

    set({ isLoading: true });

    try {
      // Tenta deletar do Supabase (apenas UUIDs válidos)
      if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const validUUIDs = ids.filter((id) => 
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
        );

        if (validUUIDs.length > 0) {
          const { error } = await supabase
            .from('events')
            .delete()
            .in('id', validUUIDs);

          if (error) {
            console.error('Erro ao deletar eventos do Supabase:', error);
          } else {
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao deletar eventos do Supabase:', error);
      // Continua removendo do estado mesmo se houver erro no Supabase
    }

    // Remove do estado
    set((state) => ({
      events: state.events.filter((e) => !ids.includes(e.id)),
      filteredEvents: state.filteredEvents.filter((e) => !ids.includes(e.id)),
      selectedEvent: state.selectedEvent && ids.includes(state.selectedEvent.id) ? null : state.selectedEvent,
      isLoading: false,
    }));
  },

  // Seleciona evento
  selectEvent: (event: Event | null) => {
    set({ selectedEvent: event });
  },

  // Define filtros
  setFilters: (filters: EventFilters) => {
    set({ filters });
    get().applyFilters();
  },

  // Limpa filtros
  clearFilters: () => {
    set({ filters: {} });
    set((state) => ({ filteredEvents: state.events }));
  },

  // Aplica filtros
  applyFilters: () => {
    const { events, filters } = get();
    
    let filtered = [...events];

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.address.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query)
      );
    }

    if (filters.eventType && filters.eventType.length > 0) {
      filtered = filtered.filter((e) => filters.eventType!.includes(e.eventType));
    }

    if (filters.ageMin !== undefined) {
      filtered = filtered.filter((e) => e.ageRange.min >= filters.ageMin!);
    }

    if (filters.ageMax !== undefined) {
      filtered = filtered.filter(
        (e) => e.ageRange.max === undefined || e.ageRange.max <= filters.ageMax!
      );
    }

    if (filters.isFree !== undefined) {
      filtered = filtered.filter((e) => e.isFree === filters.isFree);
    }

    // Filtro de preco
    if (filters.priceMin !== undefined) {
      filtered = filtered.filter((e) => {
        // Se for gratuito, nao passa no filtro de preco minimo
        if (e.isFree) return false;
        // Se nao tem preco definido, nao passa
        if (!e.price) return false;
        return e.price >= filters.priceMin!;
      });
    }

    if (filters.priceMax !== undefined) {
      filtered = filtered.filter((e) => {
        // Se for gratuito, passa no filtro de preco maximo
        if (e.isFree) return true;
        // Se nao tem preco definido, nao passa
        if (!e.price) return false;
        return e.price <= filters.priceMax!;
      });
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((e) => new Date(e.startDate) >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      filtered = filtered.filter((e) => new Date(e.startDate) <= filters.dateTo!);
    }

    // Mantem ordenacao por boosts
    filtered.sort((a, b) => b.boosts - a.boosts);

    set({ filteredEvents: filtered });
  },

  // Adiciona boost ao evento
  addBoost: async (eventId: string, amount: number) => {
    set({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 500));

    set((state) => {
      const updatedEvents = state.events.map((e) =>
        e.id === eventId ? { ...e, boosts: e.boosts + amount } : e
      );
      
      // Reordena por boosts
      updatedEvents.sort((a, b) => b.boosts - a.boosts);

      return {
        events: updatedEvents,
        filteredEvents: updatedEvents,
        isLoading: false,
      };
    });
  },

  // Incrementa visualização (uma vez por usuário)
  incrementView: async (eventId: string, userId: string) => {
    try {
      if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        // Verifica se o usuário já visualizou este evento
        const { data: existingView } = await supabase
          .from('user_event_interactions')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .eq('status', 'viewed')
          .maybeSingle();

        // Se não visualizou ainda, registra a visualização
        if (!existingView) {
          // Insere na tabela de interações (pode falhar se já existir, mas não importa)
          try {
            await supabase
              .from('user_event_interactions')
              .insert({
                user_id: userId,
                event_id: eventId,
                status: 'viewed',
              });
          } catch (error) {
            // Ignora erro se já existir (race condition)
          }

          // Incrementa contador de visualizações no evento
          const { data: eventData } = await supabase
            .from('events')
            .select('views')
            .eq('id', eventId)
            .single();

          if (eventData) {
            await supabase
              .from('events')
              .update({ views: (eventData.views || 0) + 1 })
              .eq('id', eventId);

            // Atualiza estado local
            set((state) => ({
              events: state.events.map((e) =>
                e.id === eventId ? { ...e, views: (e.views || 0) + 1 } : e
              ),
              filteredEvents: state.filteredEvents.map((e) =>
                e.id === eventId ? { ...e, views: (e.views || 0) + 1 } : e
              ),
            }));
          }
        }
      } else {
        // Fallback: incrementa apenas no estado local (sem persistência)
        set((state) => ({
          events: state.events.map((e) =>
            e.id === eventId ? { ...e, views: (e.views || 0) + 1 } : e
          ),
          filteredEvents: state.filteredEvents.map((e) =>
            e.id === eventId ? { ...e, views: (e.views || 0) + 1 } : e
          ),
        }));
      }
    } catch (error) {
      console.error('Erro ao incrementar visualização:', error);
    }
  },

  // Marca interesse no evento (uma vez por usuário)
  markInterested: async (eventId: string, userId?: string) => {
    try {
      if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && userId) {
        // Verifica se o usuário já está interessado
        const { data: existing } = await supabase
          .from('user_event_interactions')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .eq('status', 'interested')
          .maybeSingle();

        if (!existing) {
          // Insere na tabela de interações
          await supabase
            .from('user_event_interactions')
            .insert({
              user_id: userId,
              event_id: eventId,
              status: 'interested',
            })
            .catch(() => {
              // Ignora erro se já existir
            });

          // Incrementa contador
          const { data: eventData } = await supabase
            .from('events')
            .select('interested_count')
            .eq('id', eventId)
            .single();

          if (eventData) {
            await supabase
              .from('events')
              .update({ interested_count: (eventData.interested_count || 0) + 1 })
              .eq('id', eventId);
          }
        } else {
          // Já está interessado, não faz nada
          return;
        }
      }

      // Atualiza estado local
      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId ? { ...e, interestedCount: e.interestedCount + 1 } : e
        ),
        filteredEvents: state.filteredEvents.map((e) =>
          e.id === eventId ? { ...e, interestedCount: e.interestedCount + 1 } : e
        ),
      }));
    } catch (error) {
      console.error('Erro ao marcar interesse:', error);
      // Fallback: incrementa apenas no estado local
      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId ? { ...e, interestedCount: e.interestedCount + 1 } : e
        ),
        filteredEvents: state.filteredEvents.map((e) =>
          e.id === eventId ? { ...e, interestedCount: e.interestedCount + 1 } : e
        ),
      }));
    }
  },

  // Remove interesse do evento
  unmarkInterested: async (eventId: string, userId?: string) => {
    try {
      if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && userId) {
        // Remove da tabela de interações
        await supabase
          .from('user_event_interactions')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .eq('status', 'interested');

        // Decrementa contador
        const { data: eventData } = await supabase
          .from('events')
          .select('interested_count')
          .eq('id', eventId)
          .single();

        if (eventData && eventData.interested_count > 0) {
          await supabase
            .from('events')
            .update({ interested_count: Math.max(0, (eventData.interested_count || 0) - 1) })
            .eq('id', eventId);
        }
      }

      // Atualiza estado local
      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId ? { ...e, interestedCount: Math.max(0, e.interestedCount - 1) } : e
        ),
        filteredEvents: state.filteredEvents.map((e) =>
          e.id === eventId ? { ...e, interestedCount: Math.max(0, e.interestedCount - 1) } : e
        ),
      }));
    } catch (error) {
      console.error('Erro ao remover interesse:', error);
      // Fallback: decrementa apenas no estado local
      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId ? { ...e, interestedCount: Math.max(0, e.interestedCount - 1) } : e
        ),
        filteredEvents: state.filteredEvents.map((e) =>
          e.id === eventId ? { ...e, interestedCount: Math.max(0, e.interestedCount - 1) } : e
        ),
      }));
    }
  },

  // Verifica se o usuário está interessado no evento
  checkUserInterested: async (eventId: string, userId?: string): Promise<boolean> => {
    if (!userId || !supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return false;
    }

    try {
      const { data } = await supabase
        .from('user_event_interactions')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'interested')
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Erro ao verificar interesse:', error);
      return false;
    }
  },

  // Verifica se o usuário já está "going" no evento
  checkUserGoing: async (eventId: string, userId?: string): Promise<boolean> => {
    if (!userId || !supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return false;
    }

    try {
      const { data } = await supabase
        .from('user_event_interactions')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'going')
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Erro ao verificar going:', error);
      return false;
    }
  },

  // Verifica se o usuário já está "on_the_way" no evento
  checkUserOnTheWay: async (eventId: string, userId?: string): Promise<boolean> => {
    if (!userId || !supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return false;
    }

    try {
      const { data } = await supabase
        .from('user_event_interactions')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'on_the_way')
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Erro ao verificar on_the_way:', error);
      return false;
    }
  },

  // Marca "vou" (uma vez por usuário)
  markGoing: async (eventId: string, userId?: string) => {
    let insertError: any = null;
    let shouldIncrement = false;

    try {
      if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && userId) {
        // Verifica se o usuário já está "going"
        const { data: existing } = await supabase
          .from('user_event_interactions')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .eq('status', 'going')
          .maybeSingle();

        if (existing) {
          // Já está "going", não faz nada
          return;
        }

        // NÃO remove "on_the_way" - permite que o usuário tenha ambos os status
        // Isso evita que o usuário burle o sistema clicando alternadamente

        // Insere na tabela de interações (apenas se não existir)
        const { error: error } = await supabase
          .from('user_event_interactions')
          .insert({
            user_id: userId,
            event_id: eventId,
            status: 'going',
          });
        
        insertError = error;

        // 409 Conflict significa que já existe (UNIQUE constraint)
        // Isso é esperado se o usuário já clicou antes, então ignoramos silenciosamente
        if (insertError) {
          // Códigos de erro do PostgreSQL para constraint violation
          const isConflictError = 
            insertError.code === '23505' || 
            insertError.code === '409' ||
            insertError.message?.includes('duplicate') || 
            insertError.message?.includes('unique') ||
            insertError.message?.includes('already exists');
          
          if (isConflictError) {
            // Já existe, não faz nada (usuário já clicou antes)
            // Não loga para não poluir o console
            return;
          } else {
            // Outro tipo de erro, loga mas não quebra
            console.error('Erro ao inserir going:', insertError);
            return;
          }
        }

        // Se chegou aqui, a inserção foi bem-sucedida
        shouldIncrement = true;

        // Incrementa contadores no evento
        const { data: eventData } = await supabase
          .from('events')
          .select('going_count, current_attendees')
          .eq('id', eventId)
          .single();

        if (eventData) {
          await supabase
            .from('events')
            .update({
              going_count: (eventData.going_count || 0) + 1,
              current_attendees: (eventData.current_attendees || 0) + 1,
            })
            .eq('id', eventId);
        }
      } else {
        // Supabase não configurado, incrementa apenas no estado local
        shouldIncrement = true;
      }

      // Atualiza estado local (apenas se a inserção foi bem-sucedida)
      if (shouldIncrement) {
        set((state) => ({
          events: state.events.map((e) =>
            e.id === eventId
              ? { ...e, goingCount: e.goingCount + 1, currentAttendees: e.currentAttendees + 1 }
              : e
          ),
          filteredEvents: state.filteredEvents.map((e) =>
            e.id === eventId
              ? { ...e, goingCount: e.goingCount + 1, currentAttendees: e.currentAttendees + 1 }
              : e
          ),
        }));
      }
    } catch (error) {
      console.error('Erro ao marcar going:', error);
      // Fallback: incrementa apenas no estado local
      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId
            ? { ...e, goingCount: e.goingCount + 1, currentAttendees: e.currentAttendees + 1 }
            : e
        ),
        filteredEvents: state.filteredEvents.map((e) =>
          e.id === eventId
            ? { ...e, goingCount: e.goingCount + 1, currentAttendees: e.currentAttendees + 1 }
            : e
        ),
      }));
    }
  },

  // Remove "vou"
  unmarkGoing: async (eventId: string, userId?: string) => {
    try {
      if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && userId) {
        // Remove da tabela de interações
        await supabase
          .from('user_event_interactions')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .eq('status', 'going');

        // Decrementa contadores
        const { data: eventData } = await supabase
          .from('events')
          .select('going_count, current_attendees')
          .eq('id', eventId)
          .single();

        if (eventData) {
          await supabase
            .from('events')
            .update({
              going_count: Math.max(0, (eventData.going_count || 0) - 1),
              current_attendees: Math.max(0, (eventData.current_attendees || 0) - 1),
            })
            .eq('id', eventId);
        }
      }

      // Atualiza estado local
      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId
            ? {
                ...e,
                goingCount: Math.max(0, e.goingCount - 1),
                currentAttendees: Math.max(0, e.currentAttendees - 1),
              }
            : e
        ),
        filteredEvents: state.filteredEvents.map((e) =>
          e.id === eventId
            ? {
                ...e,
                goingCount: Math.max(0, e.goingCount - 1),
                currentAttendees: Math.max(0, e.currentAttendees - 1),
              }
            : e
        ),
      }));
    } catch (error) {
      console.error('Erro ao remover going:', error);
    }
  },

  // Marca "a caminho" (uma vez por usuário)
  markOnTheWay: async (eventId: string, userId?: string) => {
    let insertError: any = null;
    let shouldIncrement = false;

    try {
      if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && userId) {
        // Verifica se o usuário já está "on_the_way"
        const { data: existing } = await supabase
          .from('user_event_interactions')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .eq('status', 'on_the_way')
          .maybeSingle();

        if (existing) {
          // Já está "on_the_way", não faz nada
          return;
        }

        // NÃO remove "going" - permite que o usuário tenha ambos os status
        // Isso evita que o usuário burle o sistema clicando alternadamente

        // Insere na tabela de interações (apenas se não existir)
        const { error: error } = await supabase
          .from('user_event_interactions')
          .insert({
            user_id: userId,
            event_id: eventId,
            status: 'on_the_way',
          });
        
        insertError = error;

        // 409 Conflict significa que já existe (UNIQUE constraint)
        // Isso é esperado se o usuário já clicou antes, então ignoramos silenciosamente
        if (insertError) {
          // Códigos de erro do PostgreSQL para constraint violation
          const isConflictError = 
            insertError.code === '23505' || 
            insertError.code === '409' ||
            insertError.message?.includes('duplicate') || 
            insertError.message?.includes('unique') ||
            insertError.message?.includes('already exists');
          
          if (isConflictError) {
            // Já existe, não faz nada (usuário já clicou antes)
            // Não loga para não poluir o console
            return;
          } else {
            // Outro tipo de erro, loga mas não quebra
            console.error('Erro ao inserir on_the_way:', insertError);
            return;
          }
        }

        // Se chegou aqui, a inserção foi bem-sucedida
        shouldIncrement = true;

        // Incrementa contador no evento
        const { data: eventData } = await supabase
          .from('events')
          .select('on_the_way_count')
          .eq('id', eventId)
          .single();

        if (eventData) {
          await supabase
            .from('events')
            .update({ on_the_way_count: (eventData.on_the_way_count || 0) + 1 })
            .eq('id', eventId);
        }
      } else {
        // Supabase não configurado, incrementa apenas no estado local
        shouldIncrement = true;
      }

      // Atualiza estado local (apenas se a inserção foi bem-sucedida)
      if (shouldIncrement) {
        set((state) => ({
          events: state.events.map((e) =>
            e.id === eventId ? { ...e, onTheWayCount: e.onTheWayCount + 1 } : e
          ),
          filteredEvents: state.filteredEvents.map((e) =>
            e.id === eventId ? { ...e, onTheWayCount: e.onTheWayCount + 1 } : e
          ),
        }));
      }
    } catch (error) {
      console.error('Erro ao marcar on_the_way:', error);
      // Fallback: incrementa apenas no estado local
      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId ? { ...e, onTheWayCount: e.onTheWayCount + 1 } : e
        ),
        filteredEvents: state.filteredEvents.map((e) =>
          e.id === eventId ? { ...e, onTheWayCount: e.onTheWayCount + 1 } : e
        ),
      }));
    }
  },

  // Remove "a caminho"
  unmarkOnTheWay: async (eventId: string, userId?: string) => {
    try {
      if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && userId) {
        // Remove da tabela de interações
        await supabase
          .from('user_event_interactions')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .eq('status', 'on_the_way');

        // Decrementa contador
        const { data: eventData } = await supabase
          .from('events')
          .select('on_the_way_count')
          .eq('id', eventId)
          .single();

        if (eventData && eventData.on_the_way_count > 0) {
          await supabase
            .from('events')
            .update({ on_the_way_count: Math.max(0, (eventData.on_the_way_count || 0) - 1) })
            .eq('id', eventId);
        }
      }

      // Atualiza estado local
      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId ? { ...e, onTheWayCount: Math.max(0, e.onTheWayCount - 1) } : e
        ),
        filteredEvents: state.filteredEvents.map((e) =>
          e.id === eventId ? { ...e, onTheWayCount: Math.max(0, e.onTheWayCount - 1) } : e
        ),
      }));
    } catch (error) {
      console.error('Erro ao remover on_the_way:', error);
    }
  },

  // Adiciona convidado na lista (premium)
  addToGuestList: (eventId: string, entry: Omit<GuestListEntry, 'id' | 'addedAt'>) => {
    const newEntry: GuestListEntry = {
      ...entry,
      id: 'guest_' + Date.now(),
      eventId,
      addedAt: new Date(),
    };

    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId
          ? { ...e, guestList: [...(e.guestList || []), newEntry] }
          : e
      ),
    }));
  },

  // Remove convidado da lista
  removeFromGuestList: (eventId: string, entryId: string) => {
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId
          ? { ...e, guestList: e.guestList?.filter((g) => g.id !== entryId) }
          : e
      ),
    }));
  },

  // Atualiza status do convidado
  updateGuestStatus: (eventId: string, entryId: string, status: GuestListEntry['status']) => {
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId
          ? {
              ...e,
              guestList: e.guestList?.map((g) =>
                g.id === entryId
                  ? {
                      ...g,
                      status,
                      confirmedAt: status === 'confirmed' ? new Date() : g.confirmedAt,
                      checkedInAt: status === 'checked_in' ? new Date() : g.checkedInAt,
                    }
                  : g
              ),
            }
          : e
      ),
    }));
  },

  // Define localizacao do usuario
  setUserLocation: (coords: Coordinates | null) => {
    set({ userLocation: coords });
  },

  // Denuncia evento
  reportEvent: async (eventId: string, reason: string) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    // Aqui seria enviado para o backend
  },

  // Compra ingresso de uma categoria
  purchaseTicketCategory: async (eventId: string, categoryId: string) => {
    const { events } = get();
    const event = events.find((e) => e.id === eventId);
    
    if (!event || !event.ticketCategories) {
      throw new Error('Evento ou categorias não encontradas');
    }

    const category = event.ticketCategories.find((c) => c.id === categoryId);
    if (!category) {
      throw new Error('Categoria não encontrada');
    }

    if (category.stockRemaining <= 0) {
      throw new Error('Ingressos esgotados para esta categoria');
    }

    // Simula processamento
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Atualiza estoque
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId
          ? {
              ...e,
              ticketCategories: e.ticketCategories?.map((c) =>
                c.id === categoryId
                  ? { ...c, stockRemaining: c.stockRemaining - 1 }
                  : c
              ),
            }
          : e
      ),
      filteredEvents: state.filteredEvents.map((e) =>
        e.id === eventId
          ? {
              ...e,
              ticketCategories: e.ticketCategories?.map((c) =>
                c.id === categoryId
                  ? { ...c, stockRemaining: c.stockRemaining - 1 }
                  : c
              ),
            }
          : e
      ),
    }));
  },

  // Atualiza categoria de ingresso (apenas antes do evento)
  updateTicketCategory: async (eventId: string, categoryId: string, updates: Partial<TicketCategory>) => {
    const { events } = get();
    const event = events.find((e) => e.id === eventId);
    
    if (!event) {
      throw new Error('Evento não encontrado');
    }

    // Verifica se o evento já começou
    if (new Date(event.startDate) <= new Date()) {
      throw new Error('Não é possível alterar ingressos após o início do evento');
    }

    // Simula processamento
    await new Promise((resolve) => setTimeout(resolve, 500));

    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId
          ? {
              ...e,
              ticketCategories: e.ticketCategories?.map((c) =>
                c.id === categoryId ? { ...c, ...updates } : c
              ),
            }
          : e
      ),
      filteredEvents: state.filteredEvents.map((e) =>
        e.id === eventId
          ? {
              ...e,
              ticketCategories: e.ticketCategories?.map((c) =>
                c.id === categoryId ? { ...c, ...updates } : c
              ),
            }
          : e
      ),
    }));
  },
}));

