// ============================================
// HELPERS - Conversão de dados Supabase
// ============================================

import { Event, TicketCategory, Transaction, UserEventInteraction } from '@/types';
import { Database } from './supabase';
import { convertToUUID } from '@/utils/uuid';

// ============================================
// CONVERSÃO: Supabase -> Sistema
// ============================================

export function supabaseEventToEvent(row: Database['public']['Tables']['events']['Row']): Event {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    address: row.address,
    coordinates: row.coordinates as { lat: number; lng: number },
    maxCapacity: row.max_capacity,
    currentAttendees: row.current_attendees,
    ageRange: row.age_range as { min: number; max?: number },
    eventType: row.event_type as any,
    coverImage: row.cover_image,
    isFree: row.is_free,
    price: row.price ? Number(row.price) : undefined,
    ticketCategories: row.ticket_categories
      ? (row.ticket_categories as any[]).map((cat) => ({
          id: cat.id,
          name: cat.name,
          price: Number(cat.price),
          stockTotal: cat.stock_total,
          stockRemaining: cat.stock_remaining,
          description: cat.description || undefined,
        }))
      : undefined,
    boosts: row.boosts,
    organizerId: row.organizer_id,
    organizerName: row.organizer_name,
    isPremiumOrganizer: row.is_premium_organizer,
    startDate: new Date(row.start_date),
    endDate: row.end_date ? new Date(row.end_date) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    isActive: row.is_active,
    isApproved: row.is_approved,
    views: row.views,
    interestedCount: row.interested_count,
    goingCount: row.going_count,
    onTheWayCount: row.on_the_way_count,
    guestList: [], // Será carregado separadamente se necessário
  };
}

export function supabaseTicketCategoryToTicketCategory(
  row: Database['public']['Tables']['ticket_categories']['Row']
): TicketCategory {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    stockTotal: row.stock_total,
    stockRemaining: row.stock_remaining,
    description: row.description || undefined,
  };
}

export function supabaseTransactionToTransaction(
  row: Database['public']['Tables']['transactions']['Row']
): Transaction {
  return {
    id: row.id,
    type: row.type as 'deposit' | 'purchase' | 'refund',
    amount: Number(row.amount),
    description: row.description,
    eventId: row.event_id || undefined,
    eventName: row.event_name || undefined,
    ticketCategoryId: row.ticket_category_id || undefined,
    ticketCategoryName: row.ticket_category_name || undefined,
    status: row.status as 'completed' | 'pending' | 'failed',
    createdAt: new Date(row.created_at),
  };
}

// ============================================
// CONVERSÃO: Sistema -> Supabase
// ============================================

export function eventToSupabaseEvent(
  event: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'interestedCount' | 'goingCount' | 'onTheWayCount'>
): Database['public']['Tables']['events']['Insert'] {
  return {
    name: event.name,
    description: event.description || null,
    address: event.address,
    coordinates: event.coordinates,
    max_capacity: event.maxCapacity,
    current_attendees: event.currentAttendees,
    age_range: event.ageRange,
    event_type: event.eventType,
    cover_image: event.coverImage,
    is_free: event.isFree,
    price: event.price || null,
    ticket_categories: event.ticketCategories
      ? event.ticketCategories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          price: cat.price,
          stock_total: cat.stockTotal,
          stock_remaining: cat.stockRemaining,
          description: cat.description || null,
        }))
      : null,
    boosts: event.boosts,
    // Se já é UUID válido (do Supabase Auth), usa direto. Senão, converte.
    organizer_id: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(event.organizerId)
      ? event.organizerId
      : convertToUUID(event.organizerId),
    organizer_name: event.organizerName,
    is_premium_organizer: event.isPremiumOrganizer,
    start_date: event.startDate.toISOString(),
    end_date: event.endDate ? event.endDate.toISOString() : null,
    is_active: event.isActive,
    is_approved: event.isApproved,
  };
}

export function ticketCategoryToSupabaseTicketCategory(
  category: Omit<TicketCategory, 'id'>,
  eventId: string
): Database['public']['Tables']['ticket_categories']['Insert'] {
  return {
    event_id: eventId,
    name: category.name,
    price: category.price,
    stock_total: category.stockTotal,
    stock_remaining: category.stockRemaining,
    description: category.description || null,
  };
}

export function transactionToSupabaseTransaction(
  transaction: Omit<Transaction, 'id' | 'createdAt'>,
  userId: string
): Database['public']['Tables']['transactions']['Insert'] {
  // Se já é UUID válido (do Supabase Auth), usa direto. Senão, converte.
  const userIdUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
    ? userId
    : convertToUUID(userId);
  
  return {
    user_id: userIdUUID,
    type: transaction.type,
    amount: transaction.amount,
    description: transaction.description,
    event_id: transaction.eventId || null,
    event_name: transaction.eventName || null,
    ticket_category_id: transaction.ticketCategoryId || null,
    ticket_category_name: transaction.ticketCategoryName || null,
    status: transaction.status,
  };
}

