'use client';

import { useState } from 'react';
import { EventFilters as IEventFilters, EventType, getEventTypeLabel } from '@/types';
import { useEventStore } from '@/store/eventStore';
import { Search, Filter, X, ChevronDown } from 'lucide-react';

const eventTypes: EventType[] = ['private', 'rave', 'baile', 'bar', 'club', 'house', 'open_air', 'other'];

interface EventFiltersProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export default function EventFiltersComponent({ onClose, isMobile = false }: EventFiltersProps) {
  const { filters, setFilters, clearFilters } = useEventStore();
  const [localFilters, setLocalFilters] = useState<IEventFilters>(filters);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  const handleApply = () => {
    setFilters(localFilters);
    onClose?.();
  };

  const handleClear = () => {
    setLocalFilters({});
    clearFilters();
  };

  const toggleEventType = (type: EventType) => {
    const currentTypes = localFilters.eventType || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];
    setLocalFilters({ ...localFilters, eventType: newTypes.length > 0 ? newTypes : undefined });
  };

  return (
    <div className={`${isMobile ? 'p-4' : 'p-6'} space-y-6`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
          <Filter size={20} className="text-neon-pink" />
          Filtros
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        )}
      </div>

      {/* Busca */}
      <div>
        <label className="input-label">Buscar</label>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Nome, local..."
            value={localFilters.searchQuery || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, searchQuery: e.target.value })}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Tipo de evento */}
      <div>
        <label className="input-label">Tipo de Evento</label>
        <div className="relative">
          <button
            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            className="input-field flex items-center justify-between"
          >
            <span className="text-gray-400">
              {localFilters.eventType?.length
                ? `${localFilters.eventType.length} selecionado(s)`
                : 'Todos os tipos'}
            </span>
            <ChevronDown size={18} className={`transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isTypeDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {eventTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleEventType(type)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    localFilters.eventType?.includes(type)
                      ? 'bg-neon-pink/20 text-neon-pink'
                      : 'text-gray-300 hover:bg-dark-700'
                  }`}
                >
                  {getEventTypeLabel(type)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Faixa etaria */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="input-label">Idade Min.</label>
          <input
            type="number"
            placeholder="16"
            min={0}
            max={100}
            value={localFilters.ageMin || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, ageMin: e.target.value ? parseInt(e.target.value) : undefined })}
            className="input-field"
          />
        </div>
        <div>
          <label className="input-label">Idade Max.</label>
          <input
            type="number"
            placeholder="99"
            min={0}
            max={100}
            value={localFilters.ageMax || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, ageMax: e.target.value ? parseInt(e.target.value) : undefined })}
            className="input-field"
          />
        </div>
      </div>

      {/* Faixa de preco */}
      <div>
        <label className="input-label mb-3">Preco do Ingresso (R$)</label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label text-xs">Preco Min.</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
              <input
                type="number"
                placeholder="0,00"
                min={0}
                step={0.01}
                value={localFilters.priceMin || ''}
                onChange={(e) => setLocalFilters({ ...localFilters, priceMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div>
            <label className="input-label text-xs">Preco Max.</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
              <input
                type="number"
                placeholder="999,99"
                min={0}
                step={0.01}
                value={localFilters.priceMax || ''}
                onChange={(e) => setLocalFilters({ ...localFilters, priceMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Deixe vazio para nao filtrar por preco
        </p>
      </div>

      {/* Entrada gratuita */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="free-only"
          checked={localFilters.isFree === true}
          onChange={(e) => setLocalFilters({ ...localFilters, isFree: e.target.checked ? true : undefined })}
          className="w-5 h-5 rounded border-dark-600 bg-dark-700 text-neon-pink focus:ring-neon-pink"
        />
        <label htmlFor="free-only" className="text-gray-300 cursor-pointer">
          Apenas eventos gratuitos
        </label>
      </div>

      {/* Botoes */}
      <div className="flex gap-3 pt-4 border-t border-dark-600">
        <button onClick={handleClear} className="btn-ghost flex-1">
          Limpar
        </button>
        <button onClick={handleApply} className="btn-primary flex-1">
          Aplicar
        </button>
      </div>
    </div>
  );
}

