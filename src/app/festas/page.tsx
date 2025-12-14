'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { useEventStore } from '@/store/eventStore';
import { useAuthStore } from '@/store/authStore';
import EventCard from '@/components/Events/EventCard';
import EventDetails from '@/components/Events/EventDetails';
import EventFilters from '@/components/Events/EventFilters';
import { EventCardSkeleton } from '@/components/UI/Loading';
import { Filter, Search, TrendingUp, Grid, List, MapPin, Navigation, User } from 'lucide-react';
import Link from 'next/link';
import { Event } from '@/types';

// Funcao para calcular distancia entre duas coordenadas (Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function FestasPage() {
  const searchParams = useSearchParams();
  const { filteredEvents, fetchEvents, isLoading, addBoost, markInterested, userLocation, setUserLocation, deleteEvent } = useEventStore();
  const { user, isAuthenticated } = useAuthStore();
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'nearby' | 'my-events'>('all');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Verifica query params para abrir direto na aba "Minhas Festas"
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam === 'my-events' && isAuthenticated) {
      setCategory('my-events');
    }
  }, [searchParams, isAuthenticated]);

  // Solicita localizacao do usuario
  useEffect(() => {
    if (category === 'nearby' && !userLocation) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            setLocationError(null);
          },
          (error) => {
            console.error('Erro ao obter localizacao:', error);
            setLocationError('Nao foi possivel obter sua localizacao. Verifique as permissoes do navegador.');
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      } else {
        setLocationError('Geolocalizacao nao suportada pelo navegador.');
      }
    }
  }, [category, userLocation, setUserLocation]);

  // Filtra eventos
  let displayEvents = filteredEvents;

  // Filtro de minhas festas
  if (category === 'my-events' && isAuthenticated && user) {
    displayEvents = filteredEvents.filter((event) => event.organizerId === user.id);
  }

  // Filtro de proximidade
  if (category === 'nearby' && userLocation) {
    displayEvents = filteredEvents
      .map((event) => ({
        event,
        distance: calculateDistance(
          userLocation.lat,
          userLocation.lng,
          event.coordinates.lat,
          event.coordinates.lng
        ),
      }))
      .filter(({ distance }) => distance <= 50) // Max 50km
      .sort((a, b) => a.distance - b.distance)
      .map(({ event }) => event);
  }

  // Filtro de busca
  if (searchQuery) {
    displayEvents = displayEvents.filter(
      (e) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  return (
    <Layout>
      <div className="container-app py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl md:text-4xl text-white mb-2">
            Ranking de <span className="text-neon-pink">Festas</span>
          </h1>
          <p className="text-gray-400">
            Os eventos mais bombados ordenados por quantidade de boosts
          </p>
        </div>

        {/* Categorias */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setCategory('all')}
            className={`px-6 py-3 rounded-lg whitespace-nowrap transition-colors ${
              category === 'all'
                ? 'bg-neon-pink text-white'
                : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
            }`}
          >
            <TrendingUp size={18} className="inline mr-2" />
            Todas as Festas
          </button>
          <button
            onClick={() => setCategory('nearby')}
            className={`px-6 py-3 rounded-lg whitespace-nowrap transition-colors flex items-center gap-2 ${
              category === 'nearby'
                ? 'bg-neon-green text-white'
                : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
            }`}
          >
            <Navigation size={18} />
            Festas Proximas
            {userLocation && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                Ativo
              </span>
            )}
          </button>
          {isAuthenticated && user && (
            <button
              onClick={() => setCategory('my-events')}
              className={`px-6 py-3 rounded-lg whitespace-nowrap transition-colors flex items-center gap-2 ${
                category === 'my-events'
                  ? 'bg-neon-purple text-white'
                  : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
              }`}
            >
              <User size={18} />
              Minhas Festas
            </button>
          )}
        </div>

        {/* Mensagem de erro de localizacao */}
        {category === 'nearby' && locationError && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
            <MapPin size={20} className="text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{locationError}</p>
            <button
              onClick={() => {
                setLocationError(null);
                if ('geolocation' in navigator) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                      });
                      setLocationError(null);
                    },
                    (error) => {
                      setLocationError('Erro ao obter localizacao. Tente novamente.');
                    }
                  );
                }
              }}
              className="btn-ghost text-sm ml-auto"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Info de localizacao */}
        {category === 'nearby' && userLocation && (
          <div className="mb-6 p-4 bg-neon-green/10 border border-neon-green/30 rounded-lg flex items-center gap-3">
            <Navigation size={20} className="text-neon-green flex-shrink-0" />
            <p className="text-neon-green text-sm">
              Mostrando festas em um raio de 50km da sua localizacao
            </p>
          </div>
        )}

        {/* Controles */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar festa por nome ou local..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-12"
            />
          </div>

          {/* Botoes de controle */}
          <div className="flex gap-3">
            {/* Toggle view */}
            <div className="flex bg-dark-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-neon-pink text-white' : 'text-gray-400 hover:text-white'
                }`}
                title="Visualizacao em grade"
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-neon-pink text-white' : 'text-gray-400 hover:text-white'
                }`}
                title="Visualizacao em lista"
              >
                <List size={20} />
              </button>
            </div>

            {/* Filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showFilters
                  ? 'bg-neon-pink text-white'
                  : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
              }`}
            >
              <Filter size={20} />
              <span className="hidden sm:inline">Filtros</span>
            </button>
          </div>
        </div>

        {/* Painel de filtros */}
        {showFilters && (
          <div className="mb-8 bg-dark-800 rounded-xl border border-dark-600 animate-slide-up">
            <EventFilters onClose={() => setShowFilters(false)} />
          </div>
        )}

        {/* Info ranking */}
        <div className="flex items-center gap-2 mb-6 text-gray-400">
          <TrendingUp size={20} className="text-neon-pink" />
          <span>{displayEvents.length} festas encontradas</span>
        </div>

        {/* Lista de eventos */}
        {isLoading ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : displayEvents.length > 0 ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 max-w-2xl'}`}>
            {displayEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                rank={index + 1}
                onBoost={() => addBoost(event.id, 1)}
                onInterested={() => {
                  if (user) {
                    markInterested(event.id, user.id);
                  }
                }}
                onViewDetails={() => setSelectedEvent(event)}
                onEdit={() => {
                  window.location.href = `/cadastro-festa?edit=${event.id}`;
                }}
                onDelete={async () => {
                  try {
                    await deleteEvent(event.id, user?.id, user?.isAdmin);
                    alert('Festa apagada com sucesso!');
                    fetchEvents();
                  } catch (error: any) {
                    alert('Erro ao apagar festa: ' + error.message);
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-dark-700 flex items-center justify-center">
              {category === 'nearby' ? (
                <Navigation size={40} className="text-gray-500" />
              ) : (
                <Search size={40} className="text-gray-500" />
              )}
            </div>
            <h3 className="font-display font-bold text-xl text-white mb-2">
              {category === 'nearby'
                ? 'Nenhuma festa proxima encontrada'
                : category === 'my-events'
                ? 'Voce ainda nao criou nenhuma festa'
                : 'Nenhuma festa encontrada'}
            </h3>
            <p className="text-gray-400 mb-6">
              {category === 'nearby'
                ? 'Nao ha festas em um raio de 50km da sua localizacao. Tente ver todas as festas ou ajustar os filtros.'
                : category === 'my-events'
                ? 'Crie sua primeira festa e ela aparecera aqui!'
                : 'Tente ajustar os filtros ou buscar por outro termo'}
            </p>
            <div className="flex gap-3 justify-center">
              {category === 'nearby' && (
                <button onClick={() => setCategory('all')} className="btn-primary">
                  Ver Todas as Festas
                </button>
              )}
              {category === 'my-events' && (
                <Link href="/cadastro-festa" className="btn-primary">
                  Criar Minha Primeira Festa
                </Link>
              )}
              <button
                onClick={() => {
                  setSearchQuery('');
                  if (category === 'nearby' || category === 'my-events') setCategory('all');
                }}
                className="btn-secondary"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Modal de detalhes do evento */}
        {selectedEvent && (
          <EventDetails key={selectedEvent.id} event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
      </div>
    </Layout>
  );
}

