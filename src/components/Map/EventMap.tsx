'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Event, getPopularityLevel } from '@/types';
import { useEventStore } from '@/store/eventStore';
import { Navigation, Users, Flame, TrendingUp, Clock } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix para icones do Leaflet
const createCustomIcon = (level: 'hot' | 'medium' | 'weak') => {
  const colors = {
    hot: { bg: '#ff0000', glow: 'rgba(255, 0, 0, 0.5)' },
    medium: { bg: '#ffcc00', glow: 'rgba(255, 204, 0, 0.4)' },
    weak: { bg: '#35354a', glow: 'rgba(53, 53, 74, 0.3)' },
  };

  const color = colors[level];

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${color.bg};
        box-shadow: 0 0 15px ${color.glow};
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        cursor: pointer;
        transition: transform 0.2s;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

// Componente para centralizar mapa na localizacao do usuario
function LocationButton() {
  const map = useMap();
  const { userLocation, setUserLocation } = useEventStore();

  const handleLocate = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          map.flyTo([latitude, longitude], 14, { duration: 1.5 });
        },
        (error) => {
          console.error('Erro ao obter localizacao:', error);
          alert('Nao foi possivel obter sua localizacao. Verifique as permissoes do navegador.');
        }
      );
    }
  };

  return (
    <button
      onClick={handleLocate}
      className="absolute bottom-6 right-6 z-[1000] bg-dark-800 hover:bg-dark-700 border border-dark-600 hover:border-neon-pink p-3 rounded-full shadow-lg transition-all duration-300"
      title="Minha localizacao"
    >
      <Navigation size={24} className={userLocation ? 'text-neon-pink' : 'text-white'} />
    </button>
  );
}

// Componente de popup do evento
function EventPopupContent({ event, onSelect }: { event: Event; onSelect: (e: Event) => void }) {
  const popularityLevel = getPopularityLevel(event.currentAttendees);
  const popularityLabels = { hot: 'Bombando', medium: 'Mediano', weak: 'Fraco' };

  return (
    <div className="min-w-[280px] p-1">
      {/* Imagem de capa */}
      <div className="relative h-32 rounded-lg overflow-hidden mb-3">
        <img
          src={event.coverImage}
          alt={event.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2">
          <span className={`badge badge-${popularityLevel} text-xs`}>
            <Flame size={12} className="mr-1" />
            {popularityLabels[popularityLevel]}
          </span>
        </div>
        {event.isFree && (
          <div className="absolute top-2 left-2">
            <span className="badge badge-free text-xs">Gratis</span>
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="font-display font-bold text-lg text-white mb-1">{event.name}</h3>
      <p className="text-gray-400 text-sm mb-3 line-clamp-1">{event.address}</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-dark-700 rounded-lg">
          <Users size={14} className="mx-auto mb-1 text-neon-blue" />
          <span className="text-xs text-gray-400">Confirmados</span>
          <p className="font-bold text-white">{event.goingCount}</p>
        </div>
        <div className="text-center p-2 bg-dark-700 rounded-lg">
          <Navigation size={14} className="mx-auto mb-1 text-neon-green" />
          <span className="text-xs text-gray-400">A caminho</span>
          <p className="font-bold text-white">{event.onTheWayCount}</p>
        </div>
        <div className="text-center p-2 bg-dark-700 rounded-lg">
          <TrendingUp size={14} className="mx-auto mb-1 text-neon-pink" />
          <span className="text-xs text-gray-400">Boosts</span>
          <p className="font-bold text-white">{event.boosts}</p>
        </div>
      </div>

      {/* Faixa etaria e capacidade */}
      <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
        <span>+{event.ageRange.min} anos</span>
        <span>{event.currentAttendees}/{event.maxCapacity} pessoas</span>
      </div>

      {/* Valor da entrada */}
      <div className="mb-3 p-2 bg-dark-700 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">Entrada</span>
          {event.isFree ? (
            <span className="badge badge-free text-xs font-semibold">Gratis</span>
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

      {/* Botao */}
      <button
        onClick={() => onSelect(event)}
        className="btn-primary w-full py-2 text-sm"
      >
        Ver Detalhes
      </button>
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

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {events.map((event) => {
          const level = getPopularityLevel(event.currentAttendees);
          return (
            <Marker
              key={event.id}
              position={[event.coordinates.lat, event.coordinates.lng]}
              icon={createCustomIcon(level)}
            >
              <Popup className="event-popup">
                <EventPopupContent event={event} onSelect={onEventSelect} />
              </Popup>
            </Marker>
          );
        })}

        <LocationButton />
      </MapContainer>

      {/* Legenda */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-dark-800/90 backdrop-blur-sm border border-dark-600 rounded-lg p-3">
        <p className="text-xs text-gray-400 mb-2 font-medium">Legenda</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-white">Bombando (100+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-white">Mediano (30-100)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-dark-500" />
            <span className="text-xs text-white">Fraco (0-30)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

