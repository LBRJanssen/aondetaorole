'use client';

import { useEffect, useState, useCallback } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Event, getPopularityLevel } from '@/types';
import { useEventStore } from '@/store/eventStore';
import { Navigation, Users, Flame, TrendingUp, Clock } from 'lucide-react';

// Marcadores simples como na imagem - círculo branco com pino cinza escuro
const createCustomIcon = (level: 'hot' | 'medium' | 'weak') => {
  return (
    <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: '#ffffff',
        border: '2px solid #4a4a5a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      }}
    >
      <svg 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="#4a4a5a"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>
  );
};

// Componente de popup do evento
function EventPopupContent({ event, onSelect }: { event: Event; onSelect: (e: Event) => void }) {
  const popularityLevel = getPopularityLevel(event.currentAttendees);
  const popularityLabels = { hot: 'Bombando', medium: 'Mediano', weak: 'Fraco' };
  
  const badgeColors = {
    hot: { bg: 'bg-neon-pink/20', border: 'border-neon-pink', text: 'text-neon-pink', glow: 'shadow-neon-pink' },
    medium: { bg: 'bg-neon-blue/20', border: 'border-neon-blue', text: 'text-neon-blue', glow: 'shadow-neon-blue' },
    weak: { bg: 'bg-dark-600/50', border: 'border-dark-500', text: 'text-gray-400', glow: '' },
  };
  
  const badgeStyle = badgeColors[popularityLevel];

  return (
    <div className="min-w-[300px] max-w-[320px] bg-dark-900 rounded-2xl overflow-hidden" style={{ 
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(255, 0, 255, 0.3)',
      border: '1px solid rgba(255, 0, 255, 0.2)'
    }}>
      {/* Imagem de capa */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={event.coverImage}
          alt={event.name}
          className="w-full h-full object-cover"
        />
        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent" />
        
        {/* Badge de popularidade - posicionado para não sobrepor o X */}
        <div className={`absolute top-3 right-12 ${badgeStyle.bg} ${badgeStyle.border} border backdrop-blur-sm rounded-full px-3 py-1.5 ${badgeStyle.glow} z-10`}>
          <div className="flex items-center gap-1.5">
            <Flame size={12} className={badgeStyle.text} />
            <span className={`text-xs font-bold ${badgeStyle.text}`}>
              {popularityLabels[popularityLevel]}
            </span>
          </div>
        </div>
        
        {event.isFree && (
          <div className="absolute top-3 left-3 bg-neon-green/20 border border-neon-green backdrop-blur-sm rounded-full px-3 py-1.5 shadow-neon-green z-10">
            <span className="text-xs font-bold text-neon-green">Gratis</span>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4 bg-dark-900">
        {/* Título e endereço */}
        <h3 className="font-display font-bold text-xl text-white mb-1.5 leading-tight">
          {event.name}
        </h3>
        <p className="text-gray-400 text-sm mb-4 line-clamp-1">
          {event.address}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2.5 bg-dark-800/50 border border-dark-600 rounded-lg hover:border-neon-blue transition-colors">
            <Users size={16} className="mx-auto mb-1.5 text-neon-blue" />
            <span className="text-xs text-gray-400 block mb-0.5">Confirmados</span>
            <p className="font-bold text-white text-sm">{event.goingCount}</p>
          </div>
          <div className="text-center p-2.5 bg-dark-800/50 border border-dark-600 rounded-lg hover:border-neon-green transition-colors">
            <Navigation size={16} className="mx-auto mb-1.5 text-neon-green" />
            <span className="text-xs text-gray-400 block mb-0.5">A caminho</span>
            <p className="font-bold text-white text-sm">{event.onTheWayCount}</p>
          </div>
          <div className="text-center p-2.5 bg-dark-800/50 border border-dark-600 rounded-lg hover:border-neon-pink transition-colors">
            <TrendingUp size={16} className="mx-auto mb-1.5 text-neon-pink" />
            <span className="text-xs text-gray-400 block mb-0.5">Boosts</span>
            <p className="font-bold text-white text-sm">{event.boosts}</p>
          </div>
        </div>

        {/* Faixa etária e capacidade */}
        <div className="flex items-center justify-between text-sm mb-4 pb-4 border-b border-dark-600">
          <span className="text-gray-400">+{event.ageRange.min} anos</span>
          <span className="text-gray-400">{event.currentAttendees}/{event.maxCapacity} pessoas</span>
        </div>

        {/* Valor da entrada */}
        <div className="mb-4 p-3 bg-dark-800/30 border border-dark-600 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Entrada</span>
            {event.isFree ? (
              <span className="bg-neon-green/20 border border-neon-green text-neon-green text-xs font-bold px-2.5 py-1 rounded-full">
                Gratis
              </span>
            ) : event.ticketCategories && event.ticketCategories.length > 0 ? (
              <div className="text-right">
                <span className="font-bold text-white text-sm block">
                  {(() => {
                    const prices = event.ticketCategories!.map(c => c.price);
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    return minPrice === maxPrice 
                      ? `R$ ${minPrice.toFixed(2).replace('.', ',')}`
                      : `R$ ${minPrice.toFixed(2).replace('.', ',')} - R$ ${maxPrice.toFixed(2).replace('.', ',')}`;
                  })()}
                </span>
                <span className="text-xs text-gray-400">{event.ticketCategories.length} categorias</span>
              </div>
            ) : event.price ? (
              <span className="font-bold text-white text-sm">
                R$ {event.price.toFixed(2).replace('.', ',')}
              </span>
            ) : (
              <span className="text-xs text-gray-500">Nao informado</span>
            )}
          </div>
        </div>

        {/* Botão */}
        <button
          onClick={() => onSelect(event)}
          className="w-full py-3 px-4 bg-gradient-to-r from-neon-pink to-neon-purple hover:from-neon-pink/90 hover:to-neon-purple/90 text-white font-bold text-sm rounded-lg transition-all duration-300 shadow-neon-pink hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
        >
          Ver Detalhes
        </button>
      </div>
    </div>
  );
}

interface EventMapProps {
  events: Event[];
  onEventSelect: (event: Event) => void;
  center?: [number, number];
  zoom?: number;
}

export default function EventMap({
  events,
  onEventSelect,
  center = [-23.5505, -46.6333], // Sao Paulo como padrao
  zoom = 12,
}: EventMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: center[1],
    latitude: center[0],
    zoom: zoom,
  });
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const { userLocation, setUserLocation } = useEventStore();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLocate = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setViewState({
            longitude,
            latitude,
            zoom: 14,
          });
        },
        (error) => {
          console.error('Erro ao obter localizacao:', error);
          alert('Nao foi possivel obter sua localizacao. Verifique as permissoes do navegador.');
        }
      );
    }
  }, [setUserLocation]);

  if (!isClient) {
    return (
      <div className="w-full h-full bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-gray-400">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  // Usa um token público do Mapbox para desenvolvimento (você pode criar sua própria conta depois)
  // Para produção, você precisará criar uma conta no Mapbox e usar seu próprio token
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

  return (
    <div className="relative w-full h-full">
      <style jsx global>{`
        /* Aplica um filtro para melhorar a visibilidade no tema dark */
        .mapboxgl-canvas {
          filter: brightness(1.1) contrast(1.05) !important;
        }
        
        .mapboxgl-popup {
          max-width: none !important;
        }
        .mapboxgl-popup-content {
          background: transparent !important;
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .mapboxgl-popup-tip {
          display: none !important;
        }
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.2;
          }
          100% {
            transform: scale(1);
            opacity: 0.5;
          }
        }
        .custom-marker {
          filter: drop-shadow(0 0 8px currentColor);
        }
        
        /* Esconde o logo e atribuição do Mapbox */
        .mapboxgl-ctrl-logo,
        .mapboxgl-ctrl-attrib {
          display: none !important;
        }
      `}</style>
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        attributionControl={false}
      >
        {events.map((event) => {
          const level = getPopularityLevel(event.currentAttendees);
          return (
            <Marker
              key={event.id}
              longitude={event.coordinates.lng}
              latitude={event.coordinates.lat}
              anchor="bottom"
              onClick={() => setSelectedEvent(event)}
            >
              {createCustomIcon(level)}
            </Marker>
          );
        })}

        {selectedEvent && (
          <Popup
            longitude={selectedEvent.coordinates.lng}
            latitude={selectedEvent.coordinates.lat}
            anchor="bottom"
            onClose={() => setSelectedEvent(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <EventPopupContent event={selectedEvent} onSelect={onEventSelect} />
          </Popup>
        )}
      </Map>

      {/* Botão de localização */}
      <button
        onClick={handleLocate}
        className="absolute bottom-6 right-6 z-[1000] bg-dark-800/95 backdrop-blur-sm hover:bg-dark-700 border border-dark-600 hover:border-neon-pink p-4 rounded-full shadow-neon-pink transition-all duration-300 group"
        title="Minha localizacao"
        style={{
          boxShadow: userLocation 
            ? '0 0 20px rgba(255, 0, 255, 0.5), 0 4px 12px rgba(0, 0, 0, 0.5)' 
            : '0 4px 12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <Navigation 
          size={24} 
          className={`transition-all duration-300 ${userLocation ? 'text-neon-pink' : 'text-white group-hover:text-neon-pink'}`}
        />
      </button>

      {/* Legenda melhorada */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-dark-800/95 backdrop-blur-sm border border-dark-600 rounded-xl p-4 shadow-2xl"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 0, 255, 0.1)',
        }}
      >
        <p className="text-xs text-neon-pink mb-3 font-display font-bold uppercase tracking-wider">Legenda</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 group">
            <div 
              className="w-4 h-4 rounded-full relative"
              style={{
                background: '#ff00ff',
                boxShadow: '0 0 12px rgba(255, 0, 255, 0.8), 0 0 24px rgba(255, 0, 255, 0.4)',
              }}
            >
              <div 
                className="absolute inset-0 rounded-full animate-ping"
                style={{
                  background: '#ff00ff',
                  opacity: 0.3,
                }}
              />
            </div>
            <span className="text-xs text-white font-medium group-hover:text-neon-pink transition-colors">Bombando (100+)</span>
          </div>
          <div className="flex items-center gap-3 group">
            <div 
              className="w-4 h-4 rounded-full relative"
              style={{
                background: '#00d4ff',
                boxShadow: '0 0 12px rgba(0, 212, 255, 0.8), 0 0 24px rgba(0, 212, 255, 0.4)',
              }}
            >
              <div 
                className="absolute inset-0 rounded-full animate-ping"
                style={{
                  background: '#00d4ff',
                  opacity: 0.3,
                }}
              />
            </div>
            <span className="text-xs text-white font-medium group-hover:text-neon-blue transition-colors">Mediano (30-100)</span>
          </div>
          <div className="flex items-center gap-3 group">
            <div 
              className="w-4 h-4 rounded-full"
              style={{
                background: '#35354a',
                boxShadow: '0 0 8px rgba(53, 53, 74, 0.6)',
              }}
            />
            <span className="text-xs text-gray-400 font-medium group-hover:text-white transition-colors">Fraco (0-30)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
