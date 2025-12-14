'use client';

import { useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useWalletStore } from '@/store/walletStore';
import { useEventStore } from '@/store/eventStore';
import EventDetails from '@/components/Events/EventDetails';
import { Ticket, Calendar, MapPin, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Event } from '@/types';

export default function MeusIngressosPage() {
  const { transactions } = useWalletStore();
  const { events } = useEventStore();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Filtra apenas transacoes de compra de ingressos
  const ticketTransactions = transactions.filter((t) => t.type === 'purchase' && t.eventId);

  // Busca eventos relacionados aos ingressos
  const ticketsWithEvents = ticketTransactions.map((transaction) => {
    const event = events.find((e) => e.id === transaction.eventId);
    return {
      transaction,
      event,
    };
  });

  // Filtra por data
  const filteredTickets = ticketsWithEvents.filter(({ event, transaction }) => {
    if (!event) return false;

    const now = new Date();
    const eventDate = new Date(event.startDate);

    if (filter === 'upcoming') {
      return eventDate >= now;
    } else if (filter === 'past') {
      return eventDate < now;
    }
    return true;
  });

  // Ordena: futuros primeiro, depois passados
  filteredTickets.sort((a, b) => {
    if (!a.event || !b.event) return 0;
    const dateA = new Date(a.event.startDate);
    const dateB = new Date(b.event.startDate);
    const now = new Date();

    const aIsFuture = dateA >= now;
    const bIsFuture = dateB >= now;

    if (aIsFuture && !bIsFuture) return -1;
    if (!aIsFuture && bIsFuture) return 1;
    return dateB.getTime() - dateA.getTime();
  });

  const formatDate = (date: Date) => {
    return format(new Date(date), "EEEE, dd 'de' MMMM 'as' HH:mm", { locale: ptBR });
  };

  const formatShortDate = (date: Date) => {
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const isEventUpcoming = (eventDate: Date) => {
    return new Date(eventDate) >= new Date();
  };

  const isEventToday = (eventDate: Date) => {
    const today = new Date();
    const event = new Date(eventDate);
    return (
      event.getDate() === today.getDate() &&
      event.getMonth() === today.getMonth() &&
      event.getFullYear() === today.getFullYear()
    );
  };

  return (
    <Layout>
      <div className="container-app py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl text-white mb-2">
            Meus <span className="text-neon-pink">Ingressos</span>
          </h1>
          <p className="text-gray-400">Gerencie seus ingressos comprados</p>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'upcoming', label: 'Proximos' },
            { id: 'past', label: 'Passados' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                filter === f.id
                  ? 'bg-neon-pink text-white'
                  : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de Ingressos */}
        {filteredTickets.length > 0 ? (
          <div className="space-y-4">
            {filteredTickets.map(({ transaction, event }) => {
              if (!event) return null;

              const isUpcoming = isEventUpcoming(event.startDate);
              const isToday = isEventToday(event.startDate);

              return (
                <div
                  key={transaction.id}
                  className={`card ${
                    isUpcoming ? 'border-neon-green/50' : 'border-dark-600 opacity-75'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Imagem */}
                    <div className="w-full sm:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={event.coverImage}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {/* Status e data */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <h3 className="font-display font-bold text-lg text-white mb-1">
                            {event.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {isUpcoming && (
                              <span
                                className={`badge text-xs ${
                                  isToday
                                    ? 'bg-neon-green/20 text-neon-green border border-neon-green/50'
                                    : 'bg-neon-blue/20 text-neon-blue border border-neon-blue/50'
                                }`}
                              >
                                {isToday ? (
                                  <>
                                    <Clock size={12} className="mr-1" />
                                    Hoje
                                  </>
                                ) : (
                                  <>
                                    <Calendar size={12} className="mr-1" />
                                    Proximo
                                  </>
                                )}
                              </span>
                            )}
                            {!isUpcoming && (
                              <span className="badge bg-dark-600 text-gray-400 text-xs border border-dark-500">
                                <XCircle size={12} className="mr-1" />
                                Realizado
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              Comprado em {formatShortDate(transaction.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm text-gray-400 mb-1">Valor pago</p>
                          <p className="font-bold text-white">
                            R$ {Math.abs(transaction.amount).toFixed(2).replace('.', ',')}
                          </p>
                          {transaction.ticketCategoryName && (
                            <p className="text-xs text-neon-pink mt-1">
                              {transaction.ticketCategoryName}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Detalhes do evento */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <MapPin size={16} className="text-neon-pink flex-shrink-0" />
                          <span className="truncate">{event.address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar size={16} className="text-neon-blue flex-shrink-0" />
                          <span>{formatDate(event.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Users size={16} className="text-neon-green flex-shrink-0" />
                          <span>
                            {event.currentAttendees}/{event.maxCapacity} pessoas
                          </span>
                        </div>
                      </div>

                      {/* Info da compra */}
                      <div className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg">
                        <CheckCircle size={16} className="text-neon-green flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400">Status da compra</p>
                          <p className="text-sm text-white font-medium">
                            {transaction.status === 'completed'
                              ? 'Pagamento confirmado'
                              : transaction.status === 'pending'
                              ? 'Aguardando confirmacao'
                              : 'Falha no pagamento'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">ID</p>
                          <p className="text-xs text-gray-400 font-mono">
                            {transaction.id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>

                      {/* Botao ver detalhes */}
                      {isUpcoming && (
                        <button
                          onClick={() => setSelectedEvent(event)}
                          className="btn-secondary w-full sm:w-auto mt-4"
                        >
                          Ver Detalhes do Evento
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card text-center py-16">
            <Ticket size={64} className="mx-auto mb-4 text-gray-500" />
            <h3 className="font-display font-bold text-xl text-white mb-2">
              Nenhum ingresso encontrado
            </h3>
            <p className="text-gray-400 mb-6">
              {filter === 'all'
                ? 'Voce ainda nao comprou nenhum ingresso'
                : filter === 'upcoming'
                ? 'Voce nao tem ingressos para eventos futuros'
                : 'Voce nao tem ingressos de eventos passados'}
            </p>
            <Link href="/festas" className="btn-primary inline-block">
              Ver Festas Disponiveis
            </Link>
          </div>
        )}

        {/* Estatisticas */}
        {filteredTickets.length > 0 && (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-2xl font-bold text-white">
                {ticketsWithEvents.filter(({ event }) => event && isEventUpcoming(event.startDate)).length}
              </p>
              <p className="text-xs text-gray-500">Proximos</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-white">
                {ticketsWithEvents.filter(({ event }) => event && !isEventUpcoming(event.startDate)).length}
              </p>
              <p className="text-xs text-gray-500">Realizados</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-white">
                {ticketsWithEvents.filter(({ event }) => event && isEventToday(event.startDate)).length}
              </p>
              <p className="text-xs text-gray-500">Hoje</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-white">
                R${' '}
                {ticketsWithEvents
                  .reduce((sum, { transaction }) => sum + Math.abs(transaction.amount), 0)
                  .toFixed(2)
                  .replace('.', ',')}
              </p>
              <p className="text-xs text-gray-500">Total gasto</p>
            </div>
          </div>
        )}

        {/* Modal de detalhes do evento */}
        {selectedEvent && (
          <EventDetails event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
      </div>
    </Layout>
  );
}

