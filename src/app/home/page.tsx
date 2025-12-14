'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Layout from '@/components/Layout';
import { useEventStore } from '@/store/eventStore';
import { Event } from '@/types';
import { Filter, List, Map as MapIcon, X } from 'lucide-react';
import EventFilters from '@/components/Events/EventFilters';
import EventDetails from '@/components/Events/EventDetails';
import Loading from '@/components/UI/Loading';

// Importacao dinamica do mapa (SSR desabilitado)
const EventMap = dynamic(() => import('@/components/Map/EventMap'), {
  ssr: false,
  loading: () => <Loading text="Carregando mapa..." />,
});

export default function HomePage() {
  const { events, filteredEvents, fetchEvents, isLoading, setUserLocation } = useEventStore();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Carrega eventos ao montar
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Solicita localizacao do usuario
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Localizacao nao disponivel:', error);
        }
      );
    }
  }, [setUserLocation]);

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
  };

  return (
    <Layout hideFooter fullHeight>
      <div className="h-full flex flex-col">
        {/* Header com controles */}
        <div className="bg-dark-800/95 backdrop-blur-sm border-b border-dark-600 p-4 flex items-center justify-between gap-4 z-[1500] relative">
          <div>
            <h1 className="font-display font-bold text-xl text-white">
              Festas <span className="text-neon-pink">Proximas</span>
            </h1>
            <p className="text-sm text-gray-400">{filteredEvents.length} eventos encontrados</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle view mode - mobile */}
            <div className="flex bg-dark-700 rounded-lg p-1 md:hidden">
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'map' ? 'bg-neon-pink text-white' : 'text-gray-400'
                }`}
              >
                <MapIcon size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-neon-pink text-white' : 'text-gray-400'
                }`}
              >
                <List size={20} />
              </button>
            </div>

            {/* Botao filtros */}
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg transition-colors"
            >
              <Filter size={18} />
              <span className="hidden sm:inline">Filtros</span>
            </button>
          </div>
        </div>

        {/* Conteudo principal */}
        <div className="flex-1 flex overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loading text="Buscando festas..." />
            </div>
          ) : (
            <>
              {/* Mapa - desktop com espaco para lista, mobile condicional */}
              <div className={`flex-1 relative ${viewMode === 'map' ? 'block' : 'hidden md:block'}`}>
                <EventMap
                  events={filteredEvents}
                  onEventSelect={handleEventSelect}
                />
              </div>

              {/* Lista lateral - desktop */}
              <div className="hidden md:flex flex-col w-96 bg-dark-900/95 backdrop-blur-sm border-l border-dark-600 overflow-y-auto flex-shrink-0">
                <div className="p-4 space-y-4">
                  <h2 className="font-display font-bold text-lg text-white">
                    Ranking de Festas
                  </h2>
                  {filteredEvents.map((event, index) => (
                    <EventListItem
                      key={event.id}
                      event={event}
                      rank={index + 1}
                      onClick={() => handleEventSelect(event)}
                    />
                  ))}
                </div>
              </div>

              {/* Lista - mobile */}
              <div className={`flex-1 bg-dark-900 overflow-y-auto ${viewMode === 'list' ? 'block md:hidden' : 'hidden'}`}>
                <div className="p-4 space-y-4">
                  {filteredEvents.map((event, index) => (
                    <EventListItem
                      key={event.id}
                      event={event}
                      rank={index + 1}
                      onClick={() => handleEventSelect(event)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de filtros */}
      {showFilters && (
        <div className="fixed inset-0 bg-dark-950/90 z-[2000] flex items-end sm:items-center justify-center">
          <div className="bg-dark-800 w-full sm:max-w-md sm:rounded-xl sm:mx-4 rounded-t-xl max-h-[80vh] overflow-y-auto animate-slide-up shadow-2xl border border-dark-600">
            <EventFilters onClose={() => setShowFilters(false)} isMobile />
          </div>
        </div>
      )}

      {/* Modal de detalhes do evento */}
      {selectedEvent && (
        <EventDetails event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </Layout>
  );
}

// Componente de item da lista
function EventListItem({ event, rank, onClick }: { event: Event; rank: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-dark-800 border border-dark-600 rounded-lg p-3 flex gap-3 hover:border-neon-pink/50 transition-all text-left"
    >
      {/* Rank */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0
        ${rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-dark-900' : ''}
        ${rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-dark-900' : ''}
        ${rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' : ''}
        ${rank > 3 ? 'bg-dark-600 text-gray-400' : ''}
      `}>
        {rank}
      </div>

      {/* Imagem */}
      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
        <img src={event.coverImage} alt={event.name} className="w-full h-full object-cover" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white truncate">{event.name}</h3>
        <p className="text-sm text-gray-400 truncate">{event.address}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-neon-pink">{event.boosts} boosts</span>
          <span className="text-xs text-neon-blue">{event.goingCount} confirmados</span>
        </div>
      </div>
    </button>
  );
}

