'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/authStore';
import { useEventStore } from '@/store/eventStore';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/errorMessages';
import { supabase } from '@/lib/supabase';
import { EventType, getEventTypeLabel, TicketCategory } from '@/types';
import {
  validateEventName,
  validateDescription,
  validateImageUrl,
  validateMaxCapacity,
  validateAgeMin,
  validateAgeMax,
  validateCustomEventType,
  validatePrice,
  sanitizeInput,
} from '@/utils/validation';
import {
  MapPin,
  Calendar,
  Users,
  Image as ImageIcon,
  DollarSign,
  Info,
  CheckCircle,
  AlertCircle,
  Upload,
  Plus,
  X,
  Ticket,
  Navigation,
  Loader2,
} from 'lucide-react';

const eventTypes: EventType[] = ['private', 'rave', 'baile', 'bar', 'club', 'house', 'open_air', 'other'];

interface FormData {
  name: string;
  description: string;
  // Endereço estruturado
  cep: string;
  street: string; // Rua
  number: string; // Número
  neighborhood: string; // Bairro
  city: string; // Cidade
  state: string; // Estado (UF)
  // Campos antigos mantidos para compatibilidade (será construído a partir dos campos estruturados)
  address: string;
  maxCapacity: string;
  ageMin: string;
  ageMax: string;
  eventType: EventType;
  customEventType: string; // Tipo customizado quando "Outro" é selecionado
  coverImage: string;
  isFree: boolean;
  price: string;
  // Data estruturada
  startDay: string;
  startMonth: string;
  startYear: string;
  startTime: string;
  endDay: string;
  endMonth: string;
  endYear: string;
  endTime: string;
  // Campos antigos mantidos para compatibilidade
  startDate: string;
  endDate: string;
}

export default function CadastroFestaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const { showToast } = useToast();
  const { createEvent, updateEvent, getEventById, isLoading } = useEventStore();
  const editEventId = searchParams.get('edit');
  const isEditing = !!editEventId;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Monitora mudanças no editEventId e preserva o parâmetro na URL
  useEffect(() => {
    // Se o parâmetro edit foi removido da URL mas deveria estar lá, restaura
    if (editEventId) {
      const currentUrl = window.location.href;
      if (!currentUrl.includes(`edit=${editEventId}`)) {
        router.replace(`/cadastro-festa?edit=${editEventId}`, { scroll: false });
      }
    }
  }, [editEventId, isEditing, router]);

  // Obtém a data atual dinamicamente (sempre o ano atual)
  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Obtém o ano atual
  const getCurrentYear = () => {
    return new Date().getFullYear();
  };

  // Obtém a data atual e separa em dia, mês e ano
  const getCurrentDateParts = () => {
    const now = new Date();
    return {
      day: String(now.getDate()).padStart(2, '0'),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      year: String(now.getFullYear()),
    };
  };

  // Gera array de anos (ano atual até 5 anos no futuro)
  const getAvailableYears = () => {
    const currentYear = getCurrentYear();
    const years = [];
    for (let i = 0; i <= 5; i++) {
      years.push(String(currentYear + i));
    }
    return years;
  };

  // Gera array de dias (01 a 31)
  const getDays = () => {
    return Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  };

  // Gera array de meses (01 a 12)
  const getMonths = () => {
    return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  };

  // Nomes dos meses em português
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const currentDateParts = getCurrentDateParts();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    // Endereço estruturado
    cep: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    address: '', // Será construído automaticamente
    maxCapacity: '',
    ageMin: '18',
    ageMax: '',
    eventType: 'other',
    customEventType: '',
    coverImage: '',
    isFree: true,
    price: '',
    // Data estruturada - pré-preenchida com data atual
    startDay: currentDateParts.day,
    startMonth: currentDateParts.month,
    startYear: currentDateParts.year,
    startTime: '22:00',
    endDay: '',
    endMonth: '',
    endYear: '',
    endTime: '06:00',
    // Campos antigos para compatibilidade
    startDate: getCurrentDate(),
    endDate: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [success, setSuccess] = useState(false);
  const [useTicketCategories, setUseTicketCategories] = useState(false);
  const [ticketCategories, setTicketCategories] = useState<Omit<TicketCategory, 'id'>[]>([]);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    price: '',
    stockTotal: '',
    description: '',
  });
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Redireciona se nao estiver logado
  useEffect(() => {
    if (!isAuthenticated) {
      // Preserva o parâmetro edit na URL se existir
      const redirectUrl = editEventId 
        ? `/login?redirect=/cadastro-festa?edit=${editEventId}`
        : '/login?redirect=/cadastro-festa';
      router.push(redirectUrl);
    }
  }, [isAuthenticated, router, editEventId]);

  // Estado para controlar se já carregou o evento (evita múltiplos carregamentos)
  const [eventLoaded, setEventLoaded] = useState(false);

  // Carrega dados do evento se estiver editando
  useEffect(() => {
    const loadEvent = async () => {
      // Evita carregar múltiplas vezes
      if (eventLoaded) {
        console.log('🔄 [CadastroFesta] Evento já carregado, pulando...');
        return;
      }

      console.log('📋 [CadastroFesta] Iniciando carregamento de evento:', { isEditing, editEventId, isAuthenticated, userId: user?.id });

      // Verifica se o parâmetro edit ainda está na URL
      const currentEditId = searchParams.get('edit');
      if (editEventId && currentEditId !== editEventId) {
        // Se o parâmetro foi removido, restaura
        if (!currentEditId && editEventId) {
          console.log('🔧 [CadastroFesta] Restaurando parâmetro edit na URL:', editEventId);
          router.replace(`/cadastro-festa?edit=${editEventId}`, { scroll: false });
          return;
        }
      }

      if (isEditing && editEventId && isAuthenticated && user) {
        try {
          console.log('🔍 [CadastroFesta] Buscando evento para edição:', editEventId);
          const event = await getEventById(editEventId);
          
          if (!event) {
            console.error('❌ [CadastroFesta] Evento não encontrado:', editEventId);
            showToast('Evento não encontrado. Ele pode ter sido removido.', 'error');
            router.push('/festas');
            return;
          }

          console.log('✅ [CadastroFesta] Evento encontrado:', { id: event.id, name: event.name, organizerId: event.organizerId });

          // Verifica se o usuário é o criador
          if (event.organizerId !== user.id && !user.isAdmin) {
            console.warn('⚠️ [CadastroFesta] Usuário sem permissão para editar:', { userId: user.id, organizerId: event.organizerId, isAdmin: user.isAdmin });
            showToast('Você não tem permissão para editar este evento.', 'warning');
            router.push('/festas');
            return;
          }

          console.log('✅ [CadastroFesta] Permissão de edição confirmada');

          // Preenche o formulário com os dados do evento
          const startDate = new Date(event.startDate);
          const endDate = event.endDate ? new Date(event.endDate) : null;

          // Verifica se o tipo é customizado (não está na lista de tipos padrão)
          const standardTypes: EventType[] = ['private', 'rave', 'baile', 'bar', 'club', 'house', 'open_air', 'other'];
          const isCustomType = !standardTypes.includes(event.eventType as any);
          
          // Tenta parsear o endereço antigo (para compatibilidade com eventos existentes)
          // Se não conseguir, deixa os campos estruturados vazios
          let parsedCep = '';
          let parsedStreet = '';
          let parsedNumber = '';
          let parsedNeighborhood = '';
          let parsedCity = '';
          let parsedState = '';

          // Se o evento tem campos de endereço estruturado salvos separadamente, tenta buscar
          // Por enquanto, vamos tentar parsear do endereço completo
          // Tenta extrair CEP do endereço (formato: "CEP: xxxxx-xxx" ou similar)
          const cepMatch = event.address.match(/CEP[:\s]*(\d{5}-?\d{3})/i);
          if (cepMatch) {
            parsedCep = applyCepMask(cepMatch[1].replace(/\D/g, ''));
          }
          
          // Tenta extrair informações do endereço completo
          // Formato esperado: "Rua, Número, Bairro, Cidade - Estado" ou "Rua Número, Bairro, Cidade - Estado"
          const addressParts = event.address.split(',').map(s => s.trim());
          
          if (addressParts.length >= 1) {
            // Primeira parte pode conter rua e número juntos ou separados
            const streetPart = addressParts[0];
            
            // Tenta encontrar número no final da primeira parte (ex: "Rua Galvão Bueno 400")
            const streetNumberMatch = streetPart.match(/^(.+?)\s+(\d+)$/);
            if (streetNumberMatch) {
              parsedStreet = streetNumberMatch[1].trim();
              parsedNumber = streetNumberMatch[2].trim();
            } else {
              // Se não encontrar, tenta padrão "Rua - Número"
              const streetNumberMatch2 = streetPart.match(/^(.+?)\s*-\s*(\d+)$/);
              if (streetNumberMatch2) {
                parsedStreet = streetNumberMatch2[1].trim();
                parsedNumber = streetNumberMatch2[2].trim();
              } else {
                parsedStreet = streetPart;
                // Tenta pegar número da segunda parte se existir
                if (addressParts.length >= 2 && /^\d+$/.test(addressParts[1])) {
                  parsedNumber = addressParts[1];
                }
              }
            }
          }
          
          // Segunda parte (ou terceira se número estava na segunda) pode conter bairro
          if (addressParts.length >= 2) {
            const partIndex = parsedNumber && /^\d+$/.test(addressParts[1]) ? 2 : 1;
            if (addressParts[partIndex]) {
              parsedNeighborhood = addressParts[partIndex].replace(/^-\s*/, '').trim();
            }
          }
          
          // Terceira/quarta parte pode conter cidade e estado
          if (addressParts.length >= 3) {
            const cityStateIndex = parsedNumber && /^\d+$/.test(addressParts[1]) ? 3 : 2;
            if (addressParts[cityStateIndex]) {
              const cityState = addressParts[cityStateIndex].split('-').map(s => s.trim());
              if (cityState.length >= 1) parsedCity = cityState[0];
              if (cityState.length >= 2) parsedState = cityState[1].toUpperCase().slice(0, 2);
            }
          }
          
          // Se ainda não encontrou cidade/estado, tenta na próxima parte
          if (!parsedCity && addressParts.length >= 4) {
            const cityState = addressParts[3].split('-').map(s => s.trim());
            if (cityState.length >= 1) parsedCity = cityState[0];
            if (cityState.length >= 2) parsedState = cityState[1].toUpperCase().slice(0, 2);
          }
          

          // Separa data de início em dia, mês e ano
          // Usa métodos locais para manter a data correta (não UTC, pois a data já está no timezone local)
          const startDay = String(startDate.getDate()).padStart(2, '0');
          const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
          const startYear = String(startDate.getFullYear());

          // Separa data de término em dia, mês e ano (se houver)
          let endDay = '';
          let endMonth = '';
          let endYear = '';
          if (endDate) {
            endDay = String(endDate.getDate()).padStart(2, '0');
            endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
            endYear = String(endDate.getFullYear());
          }

          // Para eventos antigos, mantém o endereço completo no campo address
          // Os campos estruturados ficam vazios e o usuário pode preencher manualmente
          
          const formDataToSet = {
            name: event.name || '',
            description: event.description || '',
            // Endereço estruturado
            cep: parsedCep,
            street: parsedStreet,
            number: parsedNumber,
            neighborhood: parsedNeighborhood,
            city: parsedCity,
            state: parsedState,
            address: event.address || '', // Mantém o endereço antigo para compatibilidade
            maxCapacity: event.maxCapacity?.toString() || '',
            ageMin: event.ageRange?.min?.toString() || '18',
            ageMax: event.ageRange?.max?.toString() || '',
            eventType: isCustomType ? 'other' : (event.eventType || 'other'),
            customEventType: isCustomType ? event.eventType : '',
            coverImage: event.coverImage || '',
            isFree: event.isFree ?? true,
            price: event.price?.toString() || '',
            // Data estruturada
            startDay,
            startMonth,
            startYear,
            startTime: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
            endDay,
            endMonth,
            endYear,
            endTime: endDate ? `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}` : '06:00',
            // Campos antigos para compatibilidade
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate ? endDate.toISOString().split('T')[0] : '',
          };
          
          console.log('📝 [CadastroFesta] Dados do formulário preparados:', {
            name: formDataToSet.name,
            hasDescription: !!formDataToSet.description,
            address: formDataToSet.address,
            hasCoordinates: !!event.coordinates,
            eventType: formDataToSet.eventType,
            customEventType: formDataToSet.customEventType,
          });

          // Atualiza o formulário com os dados do evento
          // IMPORTANTE: Substitui completamente o estado, não faz merge
          setFormData(formDataToSet);

          // Atualiza preview da imagem
          if (formDataToSet.coverImage) {
            setImagePreview(formDataToSet.coverImage);
          }

          if (event.coordinates) {
            console.log('📍 [CadastroFesta] Coordenadas definidas:', event.coordinates);
            setCoordinates(event.coordinates);
          }

          // Carrega categorias de ingressos se houver
          if (event.ticketCategories && event.ticketCategories.length > 0) {
            console.log('🎫 [CadastroFesta] Carregando categorias de ingressos:', event.ticketCategories.length);
            setUseTicketCategories(true);
            setTicketCategories(
              event.ticketCategories.map((cat) => ({
                name: cat.name,
                price: cat.price,
                stockTotal: cat.stockTotal,
                stockRemaining: cat.stockRemaining,
                description: cat.description,
              }))
            );
          } else {
            console.log('ℹ️ [CadastroFesta] Nenhuma categoria de ingresso encontrada');
            setUseTicketCategories(false);
            setTicketCategories([]);
          }
          
          // Marca que o evento foi carregado
          setEventLoaded(true);
          console.log('✅ [CadastroFesta] Formulário preenchido com sucesso');
        } catch (error) {
          console.error('❌ [CadastroFesta] Erro ao carregar evento:', error);
          console.error('📋 [CadastroFesta] Detalhes do erro:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            editEventId,
          });
          showToast(getErrorMessage(error), 'error');
          router.push('/festas');
        }
      }
    };

    loadEvent();
  }, [isEditing, editEventId, isAuthenticated, user, getEventById, router, eventLoaded, searchParams]);

  // Reset do estado quando sair do modo de edição
  useEffect(() => {
    if (!isEditing) {
      setEventLoaded(false);
    }
  }, [isEditing]);


  // Função para aplicar máscara de CEP (xxxxx-xxx)
  const applyCepMask = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) {
      return numbers;
    }
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  // Função para construir data ISO a partir de dia, mês e ano
  const buildDateFromParts = (day: string, month: string, year: string): string => {
    if (!day || !month || !year) return '';
    return `${year}-${month}-${day}`;
  };

  // Função para validar se uma data é válida
  const isValidDate = (day: string, month: string, year: string): boolean => {
    if (!day || !month || !year) return false;
    
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    // Valida se os valores são números válidos
    if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return false;
    
    // Valida ranges básicos
    if (monthNum < 1 || monthNum > 12) return false;
    if (dayNum < 1 || dayNum > 31) return false;
    if (yearNum < 2020 || yearNum > 2100) return false;
    
    // Cria data usando UTC para evitar problemas de timezone
    const date = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
    
    // Verifica se a data criada corresponde aos valores fornecidos
    // Usa UTC para evitar problemas de timezone
    return date.getUTCDate() === dayNum && 
           date.getUTCMonth() === monthNum - 1 && 
           date.getUTCFullYear() === yearNum;
  };

  // Função para verificar se uma data é no passado
  const isDateInPast = (day: string, month: string, year: string): boolean => {
    if (!day || !month || !year) return false;
    
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return false;
    
    // Cria data usando UTC para evitar problemas de timezone
    const date = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
    const today = new Date();
    
    // Compara apenas a data (sem hora) usando UTC
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const dateUTC = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    
    return dateUTC < todayUTC;
  };

  // Função para obter o número máximo de dias em um mês
  const getMaxDaysInMonth = (month: string, year: string): number => {
    if (!month || !year) return 31;
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  };

  // Função para obter dias disponíveis para data de término (baseado na data de início)
  const getAvailableEndDays = (): string[] => {
    // Permite selecionar o dia primeiro - sempre mostra todos os dias (01-31)
    // Se mês e ano estiverem selecionados, limita ao máximo de dias do mês
    if (formData.endMonth && formData.endYear) {
      const maxDays = getMaxDaysInMonth(formData.endMonth, formData.endYear);
      const allDays = getDays().slice(0, maxDays);

      // Se tem data de início completa e válida, aplica validação
      if (formData.startDay && formData.startMonth && formData.startYear) {
        if (isValidDate(formData.startDay, formData.startMonth, formData.startYear)) {
          try {
            const startYear = parseInt(formData.startYear);
            const startMonth = parseInt(formData.startMonth);
            const startDay = parseInt(formData.startDay);
            const endYear = parseInt(formData.endYear);
            const endMonth = parseInt(formData.endMonth);

            if (!isNaN(startYear) && !isNaN(startMonth) && !isNaN(startDay) && !isNaN(endYear) && !isNaN(endMonth)) {
              // Se o ano e mês de término forem iguais aos de início, só permite dias >= dia de início
              if (endYear === startYear && endMonth === startMonth) {
                return getDays()
                  .filter((day) => {
                    const dayNum = parseInt(day);
                    return dayNum >= startDay && dayNum <= maxDays;
                  });
              }

              // Se o ano/mês de término for posterior ao de início, permite todos os dias do mês
              const startDate = new Date(startYear, startMonth - 1, startDay);
              const endDate = new Date(endYear, endMonth - 1, 1);

              if (endDate >= startDate) {
                return allDays;
              }
            }
          } catch (error) {
            // Em caso de erro, retorna todos os dias do mês
          }
        }
      }

      return allDays;
    }

    // Se mês/ano não estiverem selecionados, mostra todos os dias (01-31)
    return getDays();
  };

  // Função para obter meses disponíveis para data de término (baseado na data de início)
  const getAvailableEndMonths = (): { value: string; label: string }[] => {
    // Permite selecionar o mês sem precisar do ano primeiro - sempre mostra todos os meses
    const allMonths = getMonths().map((month, index) => ({
      value: month,
      label: monthNames[index],
    }));

    // Se ano estiver selecionado e tem data de início completa e válida, aplica validação
    if (formData.endYear && formData.startDay && formData.startMonth && formData.startYear) {
      if (isValidDate(formData.startDay, formData.startMonth, formData.startYear)) {
        try {
          const startYear = parseInt(formData.startYear);
          const startMonth = parseInt(formData.startMonth);
          const endYear = parseInt(formData.endYear);

          if (!isNaN(startYear) && !isNaN(startMonth) && !isNaN(endYear)) {
            // Se o ano de término for igual ao de início, só permite meses >= mês de início
            if (endYear === startYear) {
              return getMonths()
                .slice(startMonth - 1)
                .map((month, index) => ({
                  value: month,
                  label: monthNames[startMonth - 1 + index],
                }));
            }

            // Se o ano de término for posterior, permite todos os meses
            if (endYear > startYear) {
              return allMonths;
            }
          }
        } catch (error) {
          // Em caso de erro, retorna todos os meses
        }
      }
    }

    // Retorna todos os meses se não houver restrições
    return allMonths;
  };

  // Função para obter anos disponíveis para data de término (baseado na data de início)
  const getAvailableEndYears = (): string[] => {
    const allYears = getAvailableYears();
    
    // Se não tem data de início completa, permite todos os anos disponíveis
    if (!formData.startYear) {
      return allYears;
    }

    // Verifica se a data de início é válida antes de filtrar (mas não bloqueia se inválida)
    const isStartDateValid = formData.startMonth && formData.startDay 
      ? isValidDate(formData.startDay, formData.startMonth, formData.startYear)
      : false;

    if (!isStartDateValid) {
      return allYears;
    }

    try {
      const startYear = parseInt(formData.startYear);
      if (isNaN(startYear)) {
        return allYears;
      }
      
      const filtered = allYears.filter((year) => parseInt(year) >= startYear);
      
      // Garante que sempre retorna pelo menos os anos disponíveis
      return filtered.length > 0 ? filtered : allYears;
    } catch (error) {
      // Em caso de erro, retorna todos os anos
      return allYears;
    }
  };

  // Função para construir endereço completo a partir dos campos estruturados
  const buildFullAddress = (): string => {
    const parts = [];
    if (formData.street) parts.push(formData.street);
    if (formData.number) parts.push(formData.number);
    if (formData.neighborhood) parts.push(formData.neighborhood);
    if (formData.city) parts.push(formData.city);
    if (formData.state) parts.push(formData.state);
    if (formData.cep) parts.push(`CEP: ${formData.cep}`);
    return parts.join(', ');
  };

  // Função para buscar endereço pelo CEP usando ViaCEP
  const fetchAddressByCep = useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    
    console.log('🔍 [CadastroFesta] Buscando CEP:', cleanCep);
    
    if (cleanCep.length !== 8) {
      console.warn('⚠️ [CadastroFesta] CEP inválido (não tem 8 dígitos):', cleanCep);
      return;
    }

    setIsFetchingCep(true);
    try {
      console.log('📡 [CadastroFesta] Fazendo requisição ao ViaCEP...');
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      
      if (!response.ok) {
        console.error('❌ [CadastroFesta] Erro na resposta do ViaCEP:', response.status, response.statusText);
        throw new Error('Erro ao buscar CEP');
      }

      const data = await response.json();
      console.log('📦 [CadastroFesta] Resposta do ViaCEP:', data);

      if (data.erro) {
        console.warn('⚠️ [CadastroFesta] CEP não encontrado no ViaCEP:', cleanCep);
        setErrors((prev) => ({ ...prev, cep: 'CEP não encontrado' }));
        return;
      }

      console.log('✅ [CadastroFesta] CEP encontrado, preenchendo campos:', {
        logradouro: data.logradouro,
        bairro: data.bairro,
        localidade: data.localidade,
        uf: data.uf,
      });

      // Preenche os campos automaticamente
      const newFormData = {
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
        // Número não é preenchido, usuário deve digitar
      };

      setFormData((prev) => ({
        ...prev,
        ...newFormData,
      }));

      // Limpa erro de CEP se houver
      setErrors((prev) => ({ ...prev, cep: undefined }));
      console.log('✅ [CadastroFesta] Campos de endereço preenchidos automaticamente');

      // Dispara geocodificação imediatamente após preencher os campos do ViaCEP
      // Aguarda um pequeno delay para garantir que o estado foi atualizado
      // Usa os dados diretamente do ViaCEP para evitar problemas de timing com o estado
      setTimeout(async () => {
        if (newFormData.street && newFormData.city) {
          setIsGeocoding(true);
          setGeocodingError(null);

          try {
            // Tenta diferentes formatos de busca para melhor compatibilidade
            const searchQueries = [
              // Formato 1: Rua, Bairro, Cidade, Estado
              [newFormData.street, newFormData.neighborhood, newFormData.city, newFormData.state].filter(Boolean).join(', '),
              // Formato 2: Rua, Cidade, Estado (sem bairro)
              [newFormData.street, newFormData.city, newFormData.state].filter(Boolean).join(', '),
              // Formato 3: Apenas Cidade e Estado (fallback)
              [newFormData.city, newFormData.state].filter(Boolean).join(', '),
            ];

            let found = false;

            for (const query of searchQueries) {
              if (!query.trim()) continue;

              const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br&addressdetails=1`,
                {
                  headers: {
                    'User-Agent': 'AondeTaRole/1.0',
                  },
                }
              );

              if (!response.ok) {
                continue;
              }

              const data = await response.json();

              if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                
                if (!isNaN(lat) && !isNaN(lng)) {
                  setCoordinates({
                    lat: lat,
                    lng: lng,
                  });
                  setGeocodingError(null);
                  found = true;
                  break;
                }
              }
            }

            if (!found) {
              console.warn('⚠️ [CadastroFesta] Endereço não encontrado na geocodificação');
              setGeocodingError('Endereco nao encontrado');
            } else {
              console.log('✅ [CadastroFesta] Endereço geocodificado com sucesso:', coordinates);
            }
          } catch (error) {
            console.error('❌ [CadastroFesta] Erro na geocodificação:', error);
            setGeocodingError('Erro ao localizar endereco');
          } finally {
            setIsGeocoding(false);
          }
        }
      }, 300);
    } catch (error) {
      console.error('❌ [CadastroFesta] Erro ao buscar CEP:', error);
      console.error('📋 [CadastroFesta] Detalhes do erro CEP:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      setErrors((prev) => ({ ...prev, cep: 'Erro ao buscar CEP. Tente novamente.' }));
    } finally {
      setIsFetchingCep(false);
      console.log('🏁 [CadastroFesta] Busca de CEP finalizada');
    }
  }, []);

  const validateForm = (): boolean => {
    console.log('🔍 [CadastroFesta] Iniciando validação do formulário');
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    // Validação de nome (com sanitização)
    const nameValidation = validateEventName(formData.name);
    if (!nameValidation.valid) {
      console.warn('⚠️ [CadastroFesta] Validação de nome falhou:', nameValidation.error);
      newErrors.name = nameValidation.error || 'Nome inválido';
    } else {
      console.log('✅ [CadastroFesta] Nome válido:', formData.name);
    }

    // Validação de descrição (com sanitização)
    const descriptionValidation = validateDescription(formData.description);
    if (!descriptionValidation.valid) {
      newErrors.description = descriptionValidation.error;
    }

    // Validação de URL de imagem
    if (formData.coverImage) {
      const imageValidation = validateImageUrl(formData.coverImage);
      if (!imageValidation.valid) {
        newErrors.coverImage = imageValidation.error || 'URL de imagem inválida';
      }
    }

    // Validação de endereço estruturado
    if (!formData.cep.trim()) {
      newErrors.cep = 'CEP e obrigatorio';
    } else {
      const cleanCep = formData.cep.replace(/\D/g, '');
      if (cleanCep.length !== 8) {
        newErrors.cep = 'CEP invalido';
      }
    }

    if (!formData.street.trim()) {
      newErrors.street = 'Rua e obrigatoria';
    }

    if (!formData.number.trim()) {
      newErrors.number = 'Numero e obrigatorio';
    }

    if (!formData.neighborhood.trim()) {
      newErrors.neighborhood = 'Bairro e obrigatorio';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Cidade e obrigatoria';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'Estado e obrigatorio';
    } else if (formData.state.length !== 2) {
      newErrors.state = 'Estado deve ter 2 caracteres (UF)';
    }

    // Validação de capacidade máxima
    const capacityValidation = validateMaxCapacity(formData.maxCapacity);
    if (!capacityValidation.valid) {
      newErrors.maxCapacity = capacityValidation.error || 'Capacidade inválida';
    }

    // Validação de idade mínima
    const ageMinValidation = validateAgeMin(formData.ageMin);
    if (!ageMinValidation.valid) {
      newErrors.ageMin = ageMinValidation.error || 'Idade mínima inválida';
    }

    // Validação de idade máxima
    if (formData.ageMax) {
      const ageMaxValidation = validateAgeMax(formData.ageMax, formData.ageMin);
      if (!ageMaxValidation.valid) {
        newErrors.ageMax = ageMaxValidation.error;
      }
    }

    // Validação de data de início
    if (!formData.startDay || !formData.startMonth || !formData.startYear) {
      newErrors.startDate = 'Data de inicio e obrigatoria';
    } else {
      // Valida se a data é válida
      if (!isValidDate(formData.startDay, formData.startMonth, formData.startYear)) {
        newErrors.startDate = 'Data de inicio invalida';
      } else if (isDateInPast(formData.startDay, formData.startMonth, formData.startYear)) {
        newErrors.startDate = 'Data de inicio nao pode ser no passado';
      }
    }

    // Validação de data de término (se preenchida)
    if (formData.endDay || formData.endMonth || formData.endYear) {
      // Se algum campo foi preenchido, todos devem estar preenchidos
      if (!formData.endDay || !formData.endMonth || !formData.endYear) {
        newErrors.endDate = 'Preencha todos os campos da data de termino';
      } else {
        // Valida se a data é válida
        if (!isValidDate(formData.endDay, formData.endMonth, formData.endYear)) {
          newErrors.endDate = 'Data de termino invalida';
        } else if (formData.startDay && formData.startMonth && formData.startYear) {
          // Valida se a data de término é posterior à de início
          const startDay = parseInt(formData.startDay);
          const startMonth = parseInt(formData.startMonth);
          const startYear = parseInt(formData.startYear);
          const endDay = parseInt(formData.endDay);
          const endMonth = parseInt(formData.endMonth);
          const endYear = parseInt(formData.endYear);
          
          // Cria datas usando UTC para evitar problemas de timezone
          const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));
          const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay));
          
          if (endDate < startDate) {
            newErrors.endDate = 'Data de termino deve ser posterior a data de inicio';
          } else if (endDate.getTime() === startDate.getTime()) {
            // Se for o mesmo dia, valida o horário
            const startTime = formData.startTime || '00:00';
            const endTime = formData.endTime || '00:00';
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);
            
            const startDateTime = new Date(Date.UTC(startYear, startMonth - 1, startDay, startHour, startMin));
            const endDateTime = new Date(Date.UTC(endYear, endMonth - 1, endDay, endHour, endMin));
            
            if (endDateTime <= startDateTime) {
              newErrors.endDate = 'Data e horario de termino deve ser posterior a data e horario de inicio';
            }
          }
        }
      }
    }

    // Validação para tipo customizado
    if (formData.eventType === 'other') {
      const customTypeValidation = validateCustomEventType(formData.customEventType);
      if (!customTypeValidation.valid) {
        newErrors.customEventType = customTypeValidation.error || 'Tipo de evento inválido';
      }
    }

    // Validação para categorias de ingressos
    if (useTicketCategories) {
      if (ticketCategories.length === 0) {
        showToast('Adicione pelo menos uma categoria de ingresso.', 'warning');
        return false;
      }
    } else {
      // Validação tradicional de preço
      const priceValidation = validatePrice(formData.price, formData.isFree);
      if (!priceValidation.valid) {
        newErrors.price = priceValidation.error || 'Preço inválido';
      }
    }

    const isValid = Object.keys(newErrors).length === 0;
    if (isValid) {
      console.log('✅ [CadastroFesta] Validação do formulário passou');
    } else {
      console.warn('⚠️ [CadastroFesta] Validação do formulário falhou:', newErrors);
    }
    setErrors(newErrors);
    return isValid;
  };

  // Funcoes para gerenciar categorias
  const addCategory = () => {
    if (!categoryForm.name.trim() || !categoryForm.price || !categoryForm.stockTotal) {
      showToast('Preencha todos os campos obrigatórios da categoria.', 'warning');
      return;
    }

      const newCategory: Omit<TicketCategory, 'id'> = {
        name: sanitizeInput(categoryForm.name.trim()),
        price: parseFloat(categoryForm.price),
        stockTotal: parseInt(categoryForm.stockTotal),
        stockRemaining: parseInt(categoryForm.stockTotal),
        description: categoryForm.description ? sanitizeInput(categoryForm.description.trim()) : undefined,
      };

    if (editingCategoryIndex !== null) {
      // Edita categoria existente
      const updated = [...ticketCategories];
      updated[editingCategoryIndex] = newCategory;
      setTicketCategories(updated);
      setEditingCategoryIndex(null);
    } else {
      // Adiciona nova categoria
      setTicketCategories([...ticketCategories, newCategory]);
    }

    // Limpa formulario
    setCategoryForm({
      name: '',
      price: '',
      stockTotal: '',
      description: '',
    });
  };

  const removeCategory = (index: number) => {
    setTicketCategories(ticketCategories.filter((_, i) => i !== index));
  };

  const editCategory = (index: number) => {
    const category = ticketCategories[index];
    setCategoryForm({
      name: category.name,
      price: category.price.toString(),
      stockTotal: category.stockTotal.toString(),
      description: category.description || '',
    });
    setEditingCategoryIndex(index);
  };

  const cancelEditCategory = () => {
    setCategoryForm({
      name: '',
      price: '',
      stockTotal: '',
      description: '',
    });
    setEditingCategoryIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🚀 [CadastroFesta] Iniciando submit do formulário:', { isEditing, editEventId, userId: user?.id });

    if (!validateForm()) {
      console.warn('⚠️ [CadastroFesta] Validação do formulário falhou');
      return;
    }

    console.log('✅ [CadastroFesta] Validação do formulário passou');

    // Constrói as datas a partir dos campos estruturados
    const startDateISO = buildDateFromParts(formData.startDay, formData.startMonth, formData.startYear);
    const endDateISO = (formData.endDay && formData.endMonth && formData.endYear)
      ? buildDateFromParts(formData.endDay, formData.endMonth, formData.endYear)
      : undefined;

    const startDateTime = new Date(`${startDateISO}T${formData.startTime}`);
    const endDateTime = endDateISO
      ? new Date(`${endDateISO}T${formData.endTime}`)
      : undefined;

    try {
      // Prepara categorias de ingressos com IDs
      let existingEventCategories: TicketCategory[] = [];
      if (isEditing && editEventId) {
        const existingEvent = await getEventById(editEventId);
        existingEventCategories = existingEvent?.ticketCategories || [];
      }

      const categoriesWithIds: TicketCategory[] = useTicketCategories
        ? ticketCategories.map((cat, index) => {
            // Se estiver editando e a categoria já tiver ID, mantém o ID
            if (isEditing && editEventId) {
              const existingCategory = existingEventCategories.find((c) => c.name === cat.name);
              if (existingCategory) {
                return { ...cat, id: existingCategory.id };
              }
            }
            return {
              ...cat,
              id: `cat_${Date.now()}_${index}`,
            };
          })
        : [];

      // Usa o tipo customizado se "Outro" foi selecionado, senão usa o tipo padrão
      const finalEventType = formData.eventType === 'other' && formData.customEventType.trim()
        ? formData.customEventType.trim()
        : formData.eventType;

      // Constrói o endereço completo a partir dos campos estruturados
      const fullAddress = buildFullAddress();

      // Valida se as coordenadas foram encontradas
      if (!coordinates || !coordinates.lat || !coordinates.lng) {
        console.warn('⚠️ [CadastroFesta] Coordenadas não encontradas:', coordinates);
        showToast('Por favor, aguarde a localização do endereço ou use "Usar Minha Localização Atual".', 'warning');
        return;
      }

      console.log('📍 [CadastroFesta] Coordenadas validadas:', coordinates);

      const eventData = {
        name: sanitizeInput(formData.name),
        description: formData.description ? sanitizeInput(formData.description) : undefined,
        address: fullAddress,
        coordinates: {
          lat: coordinates.lat,
          lng: coordinates.lng,
        },
        maxCapacity: parseInt(formData.maxCapacity),
        ageRange: {
          min: parseInt(formData.ageMin),
          max: formData.ageMax ? parseInt(formData.ageMax) : undefined,
        },
        eventType: sanitizeInput(finalEventType),
        coverImage: formData.coverImage ? sanitizeInput(formData.coverImage) : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
        isFree: useTicketCategories ? false : formData.isFree,
        price: useTicketCategories ? undefined : (!formData.isFree ? parseFloat(formData.price) : undefined),
        ticketCategories: categoriesWithIds.length > 0 ? categoriesWithIds : undefined,
        startDate: startDateTime,
        endDate: endDateTime,
      };

      console.log('💾 [CadastroFesta] Dados do evento preparados:', {
        name: eventData.name,
        address: eventData.address,
        coordinates: eventData.coordinates,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        hasCategories: !!eventData.ticketCategories,
      });

      setIsSubmitting(true);

      if (isEditing && editEventId) {
        console.log('✏️ [CadastroFesta] Atualizando evento existente:', editEventId);
        await updateEvent(editEventId, eventData, user?.id, user?.isAdmin);
        console.log('✅ [CadastroFesta] Evento atualizado com sucesso');
        showToast('Evento atualizado com sucesso!', 'success');
        setSuccess(true);
        setTimeout(() => {
          router.push('/festas?category=my-events');
        }, 2000);
      } else {
        console.log('➕ [CadastroFesta] Criando novo evento');
        await createEvent({
          ...eventData,
          currentAttendees: 0,
          boosts: 0,
          organizerId: user!.id,
          organizerName: user!.name,
          isPremiumOrganizer: user!.isPremium,
          isActive: true,
          isApproved: true,
        });
        console.log('✅ [CadastroFesta] Evento criado com sucesso');
        showToast('Evento criado com sucesso!', 'success');
        setSuccess(true);
        setTimeout(() => {
          router.push('/festas');
        }, 2000);
      }
    } catch (error) {
      console.error(`❌ [CadastroFesta] Erro ao ${isEditing ? 'editar' : 'criar'} evento:`, error);
      console.error('📋 [CadastroFesta] Detalhes do erro:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        formData: {
          name: formData.name,
          address: formData.address,
          hasCoordinates: !!coordinates,
        },
      });
      showToast(getErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para fazer upload de imagem
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação do arquivo
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      showToast('Formato de imagem inválido. Use JPG, PNG ou WEBP.', 'error');
      return;
    }

    if (file.size > maxSize) {
      showToast('Imagem muito grande. Tamanho máximo: 5MB.', 'error');
      return;
    }

    setIsUploadingImage(true);

    try {
      if (!supabase) {
        throw new Error('Supabase não está configurado. Configure as variáveis de ambiente.');
      }

      // Gera nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id || 'anonymous'}-${Date.now()}.${fileExt}`;
      const filePath = `event-covers/${fileName}`;

      // Faz upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase!.storage
        .from('event-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtém URL pública da imagem
      const { data: { publicUrl } } = supabase!.storage
        .from('event-images')
        .getPublicUrl(filePath);

      // Atualiza o formulário com a URL
      setFormData((prev) => ({
        ...prev,
        coverImage: publicUrl,
      }));

      setImagePreview(publicUrl);
      showToast('Imagem enviada com sucesso!', 'success');
    } catch (error: any) {
      console.error('Erro ao fazer upload da imagem:', error);
      showToast(
        error.message || 'Erro ao fazer upload da imagem. Tente novamente.',
        'error'
      );
    } finally {
      setIsUploadingImage(false);
      // Limpa o input para permitir selecionar o mesmo arquivo novamente
      e.target.value = '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => {
      // Não sanitiza durante a digitação para permitir espaços e caracteres normais
      // A sanitização será feita apenas na validação final antes de salvar
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };
      
      // Aplica máscara de CEP
      if (name === 'cep') {
        newData.cep = applyCepMask(value);
      }
      
      // Converte estado (UF) para maiúsculas
      if (name === 'state') {
        newData.state = value.toUpperCase().slice(0, 2);
      }
      
      // Se mudou o tipo de evento e não é "other", limpa o campo customizado
      if (name === 'eventType' && value !== 'other') {
        newData.customEventType = '';
      }

      // Ajusta o dia quando mês ou ano muda (data de início)
      if (name === 'startMonth' || name === 'startYear' || name === 'startDay') {
        if (name === 'startMonth' || name === 'startYear') {
          const maxDays = getMaxDaysInMonth(newData.startMonth, newData.startYear);
          if (newData.startDay && parseInt(newData.startDay) > maxDays) {
            newData.startDay = String(maxDays).padStart(2, '0');
          }
        }
        // Atualiza startDate para compatibilidade
        if (newData.startDay && newData.startMonth && newData.startYear) {
          newData.startDate = buildDateFromParts(newData.startDay, newData.startMonth, newData.startYear);
          
          // Se a data de término for anterior à nova data de início, limpa a data de término
          if (newData.endDay && newData.endMonth && newData.endYear) {
            const startDate = new Date(
              parseInt(newData.startYear),
              parseInt(newData.startMonth) - 1,
              parseInt(newData.startDay)
            );
            const endDate = new Date(
              parseInt(newData.endYear),
              parseInt(newData.endMonth) - 1,
              parseInt(newData.endDay)
            );
            
            if (endDate < startDate) {
              newData.endDay = '';
              newData.endMonth = '';
              newData.endYear = '';
              newData.endDate = '';
            }
          }
        }
      }

      // Ajusta quando dia, mês ou ano de término mudam (ordem: dia primeiro, depois mês, depois ano)
      if (name === 'endDay' || name === 'endMonth' || name === 'endYear') {
        // Se mês ou ano foi limpo, ajusta o dia se necessário
        if ((name === 'endMonth' || name === 'endYear') && (!newData.endMonth || !newData.endYear)) {
          // Se mês ou ano foi limpo, não limpa o dia (permite selecionar dia primeiro)
          newData.endDate = '';
        } else {
          // Valida e ajusta quando todos os campos estão preenchidos
          if (newData.endDay && newData.endMonth && newData.endYear) {
            const maxDays = getMaxDaysInMonth(newData.endMonth, newData.endYear);
            
            // Ajusta o dia se for maior que o máximo do mês
            if (parseInt(newData.endDay) > maxDays) {
              newData.endDay = String(maxDays).padStart(2, '0');
            }
            
            // Valida se a data de término não é anterior à data de início
            if (newData.startDay && newData.startMonth && newData.startYear) {
              const startYear = parseInt(newData.startYear);
              const startMonth = parseInt(newData.startMonth);
              const startDay = parseInt(newData.startDay);
              const endYear = parseInt(newData.endYear);
              const endMonth = parseInt(newData.endMonth);
              const endDay = parseInt(newData.endDay);

              if (!isNaN(startYear) && !isNaN(startMonth) && !isNaN(startDay) &&
                  !isNaN(endYear) && !isNaN(endMonth) && !isNaN(endDay)) {
                const startDate = new Date(startYear, startMonth - 1, startDay);
                const endDate = new Date(endYear, endMonth - 1, endDay);
                
                if (endDate < startDate) {
                  // Se a data de término for anterior, ajusta para a data de início
                  newData.endYear = newData.startYear;
                  newData.endMonth = newData.startMonth;
                  newData.endDay = newData.startDay;
                } else if (endYear === startYear && endMonth === startMonth && endDay < startDay) {
                  // Se for o mesmo mês/ano mas dia anterior, ajusta para o dia de início
                  newData.endDay = newData.startDay;
                }
              }
            }
            
            // Atualiza endDate para compatibilidade
            newData.endDate = buildDateFromParts(newData.endDay, newData.endMonth, newData.endYear);
          }
        }
      }
      
      return newData;
    });

    // Limpa erro do campo ao digitar
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Handler específico para onBlur do CEP
  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      await fetchAddressByCep(cep);
    }
  };

  // Função auxiliar para geocodificar com campos específicos
  const geocodeAddressFromFields = useCallback(async (
    street: string,
    neighborhood: string,
    city: string,
    state: string
  ) => {
    if (!street.trim() || !city.trim()) {
      return;
    }

    setIsGeocoding(true);
    setGeocodingError(null);

    try {
      // Tenta diferentes formatos de busca para melhor compatibilidade
      const searchQueries = [
        // Formato 1: Rua, Bairro, Cidade, Estado
        [street, neighborhood, city, state].filter(Boolean).join(', '),
        // Formato 2: Rua, Cidade, Estado (sem bairro)
        [street, city, state].filter(Boolean).join(', '),
        // Formato 3: Apenas Cidade e Estado (fallback)
        [city, state].filter(Boolean).join(', '),
      ];

      let found = false;

      for (const query of searchQueries) {
        if (!query.trim()) continue;

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'AondeTaRole/1.0',
            },
          }
        );

        if (!response.ok) {
          continue;
        }

        const data = await response.json();

        if (data && data.length > 0) {
          const result = data[0];
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          
          console.log('🗺️ [CadastroFesta] Resultado da geocodificação:', { query, result: result.display_name, lat, lng });
          
          if (!isNaN(lat) && !isNaN(lng)) {
            setCoordinates({
              lat: lat,
              lng: lng,
            });
            setGeocodingError(null);
            found = true;
            console.log('✅ [CadastroFesta] Coordenadas definidas:', { lat, lng });
            break;
          } else {
            console.warn('⚠️ [CadastroFesta] Coordenadas inválidas do Nominatim:', { lat, lng });
          }
        }
      }

      if (!found) {
        setGeocodingError('Endereco nao encontrado');
      }
    } catch (error) {
      console.error('Erro na geocodificacao:', error);
      setGeocodingError('Erro ao localizar endereco');
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Funcao para geocodificar endereco usando campos estruturados (converter endereco em coordenadas)
  const geocodeAddress = useCallback(async () => {
    // Só executa se Rua e Cidade estiverem preenchidos (número é opcional para busca)
    if (!formData.street.trim() || !formData.city.trim()) {
      return;
    }

    await geocodeAddressFromFields(
      formData.street,
      formData.neighborhood,
      formData.city,
      formData.state
    );
  }, [formData.street, formData.neighborhood, formData.city, formData.state, geocodeAddressFromFields]);

  // Debounce para geocodificacao (1.5 segundos após parar de digitar)
  useEffect(() => {
    // Só executa se Rua e Cidade estiverem preenchidos (número não é necessário para busca)
    if (!formData.street.trim() || !formData.city.trim()) {
      setGeocodingError(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      geocodeAddress();
    }, 1500); // Espera 1.5 segundos apos parar de digitar (respeitando taxa de 1 req/seg)

    return () => clearTimeout(timeoutId);
  }, [formData.street, formData.neighborhood, formData.city, formData.state, geocodeAddress]);

  // Obtem localizacao atual e faz reverse geocoding
  const handleGetLocation = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lng: longitude });

          // Faz reverse geocoding para obter o endereco
          try {
            setIsGeocoding(true);
            setGeocodingError(null);

            // Usa Nominatim com mais detalhes e zoom para melhor precisão
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18&accept-language=pt-BR`,
              {
                headers: {
                  'User-Agent': 'AondeTaRole/1.0',
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data && data.address) {
                const addr = data.address;
                
                // Tenta obter o CEP do Nominatim
                let cepFromNominatim = '';
                if (addr.postcode) {
                  // Remove caracteres não numéricos e garante 8 dígitos
                  const cleanPostcode = addr.postcode.replace(/\D/g, '');
                  if (cleanPostcode.length === 8) {
                    cepFromNominatim = applyCepMask(cleanPostcode);
                  }
                }

                // Se encontrou CEP, busca no ViaCEP para obter endereço mais preciso
                if (cepFromNominatim) {
                  try {
                    const cepClean = cepFromNominatim.replace(/\D/g, '');
                    const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
                    
                    if (viaCepResponse.ok) {
                      const viaCepData = await viaCepResponse.json();
                      
                      if (!viaCepData.erro && viaCepData.logradouro) {
                        // Usa dados do ViaCEP (mais preciso para Brasil)
                        setFormData((prev) => ({
                          ...prev,
                          cep: cepFromNominatim,
                          street: viaCepData.logradouro || '',
                          number: addr.house_number || '',
                          neighborhood: viaCepData.bairro || addr.suburb || addr.neighbourhood || '',
                          city: viaCepData.localidade || addr.city || addr.town || '',
                          state: viaCepData.uf || addr.state_code || addr.state || '',
                          address: `${viaCepData.logradouro || ''}, ${viaCepData.bairro || ''}, ${viaCepData.localidade || ''} - ${viaCepData.uf || ''}`.replace(/^,\s*|,\s*$/g, ''),
                        }));
                        setGeocodingError(null);
                        setIsGeocoding(false);
                        return;
                      }
                    }
                  } catch (viaCepError) {
                    console.error('Erro ao buscar CEP no ViaCEP:', viaCepError);
                    // Continua com dados do Nominatim se ViaCEP falhar
                  }
                }

                // Se não encontrou CEP ou ViaCEP falhou, usa dados do Nominatim
                // Mapeia campos do Nominatim para formato brasileiro
                const street = addr.road || addr.street || addr.pedestrian || '';
                const neighborhood = addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || '';
                const city = addr.city || addr.town || addr.village || addr.municipality || '';
                const state = addr.state_code || addr.state || '';
                
                setFormData((prev) => ({
                  ...prev,
                  street: street,
                  number: addr.house_number || '',
                  neighborhood: neighborhood,
                  city: city,
                  state: state.length === 2 ? state.toUpperCase() : state,
                  cep: cepFromNominatim,
                  address: data.display_name || '',
                }));

                // Se não encontrou rua, mostra aviso
                if (!street) {
                  setGeocodingError('Endereco encontrado, mas alguns dados podem estar incompletos. Verifique e complete manualmente.');
                } else {
                  setGeocodingError(null);
                }
              } else {
                setGeocodingError('Nao foi possivel obter o endereco a partir da localizacao.');
              }
            } else {
              setGeocodingError('Erro ao buscar endereco a partir da localizacao.');
            }
          } catch (error) {
            console.error('Erro no reverse geocoding:', error);
            setGeocodingError('Erro ao obter endereco. Tente preencher manualmente.');
          } finally {
            setIsGeocoding(false);
          }
        },
        (error) => {
          setIsGeocoding(false);
          setGeocodingError('Nao foi possivel obter sua localizacao. Verifique as permissoes do navegador.');
          showToast('Não foi possível obter sua localização. Verifique as permissões do navegador.', 'error');
        }
      );
    } else {
      showToast('Geolocalização não é suportada neste navegador.', 'warning');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (success) {
    return (
      <Layout>
        <div className="container-app py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-neon-green/20 flex items-center justify-center">
              <CheckCircle size={48} className="text-neon-green" />
            </div>
            <h1 className="font-display font-bold text-2xl text-white mb-4">
              {isEditing ? 'Festa Atualizada com Sucesso!' : 'Festa Cadastrada com Sucesso!'}
            </h1>
            <p className="text-gray-400 mb-8">
              {isEditing
                ? 'As alteracoes foram salvas e ja estao visiveis para todos os usuarios.'
                : 'Seu evento foi criado e ja esta visivel para todos os usuarios.'}
            </p>
            <div className="loading-spinner mx-auto" />
            <p className="text-sm text-gray-500 mt-4">Redirecionando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-app py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display font-bold text-3xl text-white mb-2">
              {isEditing ? 'Editar' : 'Cadastrar'} <span className="text-neon-pink">Festa</span>
            </h1>
            <p className="text-gray-400">
              {isEditing
                ? 'Atualize os dados do seu evento'
                : 'Preencha os dados do seu evento para divulgar no mapa'}
            </p>
          </div>

          {/* Aviso usuario comum */}
          {!user?.isPremium && (
            <div className="mb-6 p-4 bg-neon-purple/10 border border-neon-purple/30 rounded-lg flex items-start gap-3">
              <Info size={20} className="text-neon-purple flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">Voce esta usando uma conta comum</p>
                <p className="text-sm text-gray-400">
                  Usuarios premium tem acesso ao dashboard de gestao, lista de convidados e estatisticas.{' '}
                  <a href="/premium" className="text-neon-purple hover:underline">
                    Saiba mais
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informacoes basicas */}
            <div className="card">
              <h2 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
                <Info size={20} className="text-neon-pink" />
                Informacoes Basicas
              </h2>

              <div className="space-y-4">
                {/* Nome */}
                <div>
                  <label htmlFor="name" className="input-label">
                    Nome do Evento *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ex: Rave Underground SP"
                    className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                    maxLength={100}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                {/* Descricao */}
                <div>
                  <label htmlFor="description" className="input-label">
                    Descricao
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Descreva seu evento..."
                    className="input-field resize-none"
                    maxLength={2000}
                  />
                  {formData.description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.description.length}/2000 caracteres
                    </p>
                  )}
                </div>

                {/* Tipo de evento */}
                <div>
                  <label htmlFor="eventType" className="input-label">
                    Tipo de Evento *
                  </label>
                  <select
                    id="eventType"
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleChange}
                    className="input-field"
                  >
                    {eventTypes.map((type) => (
                      <option key={type} value={type}>
                        {getEventTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                  {formData.eventType === 'other' && (
                    <div className="mt-3">
                      <label htmlFor="customEventType" className="input-label">
                        Digite o tipo de evento *
                      </label>
                      <input
                        type="text"
                        id="customEventType"
                        name="customEventType"
                        value={formData.customEventType}
                        onChange={handleChange}
                        placeholder="Ex: Festival, Show, Stand-up, etc."
                        className={`input-field ${errors.customEventType ? 'border-red-500' : ''}`}
                        maxLength={50}
                      />
                      {errors.customEventType && (
                        <p className="text-red-500 text-sm mt-1">{errors.customEventType}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Localizacao */}
            <div className="card">
              <h2 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
                <MapPin size={20} className="text-neon-pink" />
                Localizacao
              </h2>

              <div className="space-y-4">
                {/* CEP */}
                <div>
                  <label htmlFor="cep" className="input-label">
                    CEP *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="cep"
                      name="cep"
                      value={formData.cep}
                      onChange={handleChange}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      maxLength={9}
                      className={`input-field pr-10 ${errors.cep ? 'border-red-500' : ''}`}
                    />
                    {isFetchingCep && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 size={18} className="text-neon-blue animate-spin" />
                      </div>
                    )}
                  </div>
                  {errors.cep && <p className="text-red-500 text-sm mt-1">{errors.cep}</p>}
                  {isFetchingCep && (
                    <p className="text-neon-blue text-sm mt-1">Buscando endereço...</p>
                  )}
                </div>

                {/* Rua e Número */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="street" className="input-label">
                      Rua *
                    </label>
                    <input
                      type="text"
                      id="street"
                      name="street"
                      value={formData.street}
                      onChange={handleChange}
                      placeholder="Ex: Rua Augusta"
                      className={`input-field ${errors.street ? 'border-red-500' : ''}`}
                    />
                    {errors.street && <p className="text-red-500 text-sm mt-1">{errors.street}</p>}
                  </div>
                  <div>
                    <label htmlFor="number" className="input-label">
                      Número *
                    </label>
                    <input
                      type="text"
                      id="number"
                      name="number"
                      value={formData.number}
                      onChange={handleChange}
                      placeholder="Ex: 1500"
                      className={`input-field ${errors.number ? 'border-red-500' : ''}`}
                    />
                    {errors.number && <p className="text-red-500 text-sm mt-1">{errors.number}</p>}
                  </div>
                </div>

                {/* Bairro */}
                <div>
                  <label htmlFor="neighborhood" className="input-label">
                    Bairro *
                  </label>
                  <input
                    type="text"
                    id="neighborhood"
                    name="neighborhood"
                    value={formData.neighborhood}
                    onChange={handleChange}
                    placeholder="Ex: Consolacao"
                    className={`input-field ${errors.neighborhood ? 'border-red-500' : ''}`}
                  />
                  {errors.neighborhood && <p className="text-red-500 text-sm mt-1">{errors.neighborhood}</p>}
                </div>

                {/* Cidade e Estado */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="city" className="input-label">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Ex: Sao Paulo"
                      className={`input-field ${errors.city ? 'border-red-500' : ''}`}
                    />
                    {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                  </div>
                  <div>
                    <label htmlFor="state" className="input-label">
                      Estado (UF) *
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="SP"
                      maxLength={2}
                      className={`input-field uppercase ${errors.state ? 'border-red-500' : ''}`}
                      style={{ textTransform: 'uppercase' }}
                    />
                    {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                  </div>
                </div>

                {/* Status da geocodificação */}
                {isGeocoding && (
                  <div className="flex items-center gap-2 text-neon-blue text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Localizando endereço...</span>
                  </div>
                )}
                {!isGeocoding && geocodingError && (
                  <p className="text-yellow-500 text-sm flex items-center gap-1">
                    <AlertCircle size={14} />
                    {geocodingError}. Verifique o endereco ou use "Usar Minha Localizacao Atual"
                  </p>
                )}
                {!isGeocoding && !geocodingError && formData.street && formData.city && coordinates && coordinates.lat && coordinates.lng && (
                  <p className="text-neon-green text-sm flex items-center gap-1">
                    <CheckCircle size={14} />
                    Endereco localizado com sucesso
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isGeocoding}
                  className="btn-secondary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeocoding ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Localizando...
                    </>
                  ) : (
                    <>
                      <Navigation size={18} />
                      Usar Minha Localizacao Atual
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Data e horario */}
            <div className="card">
              <h2 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-neon-pink" />
                Data e Horario
              </h2>

              <div className="space-y-4">
                {/* Data e Horário de Início - Responsivo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">
                      Data de Inicio *
                    </label>
                    <div className="grid grid-cols-3 gap-2 min-w-0">
                      {/* Dia */}
                      <div className="min-w-0">
                        <select
                          id="startDay"
                          name="startDay"
                          value={formData.startDay}
                          onChange={handleChange}
                          className={`input-field w-full ${errors.startDate ? 'border-red-500' : ''}`}
                        >
                          <option value="">Dia</option>
                          {getDays()
                            .slice(0, getMaxDaysInMonth(formData.startMonth || '01', String(formData.startYear || getCurrentYear())))
                            .map((day) => (
                              <option key={day} value={day}>
                                {day}
                              </option>
                            ))}
                        </select>
                      </div>
                      {/* Mês */}
                      <div className="min-w-0">
                        <select
                          id="startMonth"
                          name="startMonth"
                          value={formData.startMonth}
                          onChange={handleChange}
                          className={`input-field w-full ${errors.startDate ? 'border-red-500' : ''}`}
                        >
                          <option value="">Mês</option>
                          {getMonths().map((month, index) => (
                            <option key={month} value={month}>
                              {monthNames[index]}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Ano */}
                      <div className="min-w-0">
                        <select
                          id="startYear"
                          name="startYear"
                          value={formData.startYear}
                          onChange={handleChange}
                          className={`input-field w-full ${errors.startDate ? 'border-red-500' : ''}`}
                        >
                          <option value="">Ano</option>
                          {getAvailableYears().map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
                  </div>
                  <div>
                    <label htmlFor="startTime" className="input-label">
                      Horario de Inicio
                    </label>
                    <input
                      type="time"
                      id="startTime"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      className="input-field w-full"
                      inputMode="none"
                      onClick={(e) => {
                        // Garante que o seletor de hora abra no mobile
                        if (window.innerWidth <= 640 && (e.target as HTMLInputElement).showPicker) {
                          (e.target as HTMLInputElement).showPicker();
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Data e Horário de Término - Responsivo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">
                      Data de Termino
                    </label>
                    <div className="grid grid-cols-3 gap-2 min-w-0">
                      {/* Dia - PRIMEIRO */}
                      <div className="min-w-0">
                        <select
                          id="endDay"
                          name="endDay"
                          value={formData.endDay}
                          onChange={handleChange}
                          className={`input-field w-full ${errors.endDate ? 'border-red-500' : ''}`}
                        >
                          <option value="">Dia</option>
                          {getAvailableEndDays().map((day) => (
                            <option key={day} value={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Mês - SEGUNDO */}
                      <div className="min-w-0">
                        <select
                          id="endMonth"
                          name="endMonth"
                          value={formData.endMonth}
                          onChange={handleChange}
                          className={`input-field w-full ${errors.endDate ? 'border-red-500' : ''}`}
                        >
                          <option value="">Mês</option>
                          {getAvailableEndMonths().map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Ano - TERCEIRO */}
                      <div className="min-w-0">
                        <select
                          id="endYear"
                          name="endYear"
                          value={formData.endYear}
                          onChange={handleChange}
                          className={`input-field w-full ${errors.endDate ? 'border-red-500' : ''}`}
                        >
                          <option value="">Ano</option>
                          {getAvailableEndYears().map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
                  </div>
                  <div>
                    <label htmlFor="endTime" className="input-label">
                      Horario de Termino
                    </label>
                    <input
                      type="time"
                      id="endTime"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      className="input-field w-full"
                      inputMode="none"
                      onClick={(e) => {
                        // Garante que o seletor de hora abra no mobile
                        if (window.innerWidth <= 640 && (e.target as HTMLInputElement).showPicker) {
                          (e.target as HTMLInputElement).showPicker();
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Capacidade e faixa etaria */}
            <div className="card">
              <h2 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
                <Users size={20} className="text-neon-pink" />
                Capacidade e Faixa Etaria
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="maxCapacity" className="input-label">
                    Capacidade Maxima *
                  </label>
                  <input
                    type="number"
                    id="maxCapacity"
                    name="maxCapacity"
                    value={formData.maxCapacity}
                    onChange={handleChange}
                    min={1}
                    placeholder="Ex: 500"
                    className={`input-field ${errors.maxCapacity ? 'border-red-500' : ''}`}
                  />
                  {errors.maxCapacity && <p className="text-red-500 text-sm mt-1">{errors.maxCapacity}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ageMin" className="input-label">
                      Idade Minima *
                    </label>
                    <input
                      type="number"
                      id="ageMin"
                      name="ageMin"
                      value={formData.ageMin}
                      onChange={handleChange}
                      min={0}
                      max={100}
                      className={`input-field ${errors.ageMin ? 'border-red-500' : ''}`}
                    />
                    {errors.ageMin && <p className="text-red-500 text-sm mt-1">{errors.ageMin}</p>}
                  </div>
                  <div>
                    <label htmlFor="ageMax" className="input-label">
                      Idade Maxima (opcional)
                    </label>
                    <input
                      type="number"
                      id="ageMax"
                      name="ageMax"
                      value={formData.ageMax}
                      onChange={handleChange}
                      min={0}
                      max={100}
                      placeholder="Deixe vazio para +18"
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Entrada */}
            <div className="card">
              <h2 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-neon-pink" />
                Entrada
              </h2>

              <div className="space-y-3">
                {/* Opção: Evento Gratuito */}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, isFree: true });
                    setUseTicketCategories(false);
                  }}
                  className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 w-full text-left ${
                    formData.isFree && !useTicketCategories
                      ? 'bg-neon-green/10 border-neon-green'
                      : 'bg-dark-800/50 border-dark-600 hover:border-dark-500 hover:bg-dark-700/50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    formData.isFree && !useTicketCategories
                      ? 'bg-neon-green border-neon-green'
                      : 'border-dark-500 bg-dark-700'
                  }`}>
                    {formData.isFree && !useTicketCategories && (
                      <CheckCircle size={16} className="text-dark-900" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={`font-medium ${formData.isFree && !useTicketCategories ? 'text-neon-green' : 'text-white'}`}>
                    Evento gratuito
                    </span>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Sem cobrança de entrada
                    </p>
                </div>
                  {formData.isFree && !useTicketCategories && (
                    <span className="px-2 py-1 bg-neon-green/20 text-neon-green text-xs font-semibold rounded-full">
                      GRÁTIS
                    </span>
                  )}
                </button>

                {/* Opção: Entrada Paga (preço único) */}
                <button
                  type="button"
                  onClick={() => {
                        setFormData({ ...formData, isFree: false });
                    setUseTicketCategories(false);
                    }}
                  className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 w-full text-left ${
                    !formData.isFree && !useTicketCategories
                      ? 'bg-neon-pink/10 border-neon-pink'
                      : 'bg-dark-800/50 border-dark-600 hover:border-dark-500 hover:bg-dark-700/50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    !formData.isFree && !useTicketCategories
                      ? 'bg-neon-pink border-neon-pink'
                      : 'border-dark-500 bg-dark-700'
                  }`}>
                    {!formData.isFree && !useTicketCategories && (
                      <CheckCircle size={16} className="text-white" />
                    )}
                </div>
                  <div className="flex-1">
                    <span className={`font-medium ${!formData.isFree && !useTicketCategories ? 'text-neon-pink' : 'text-white'}`}>
                      Entrada paga
                    </span>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Valor único para todos
                    </p>
                  </div>
                  {!formData.isFree && !useTicketCategories && (
                    <DollarSign size={20} className="text-neon-pink" />
                  )}
                </button>

                {/* Opção: Categorias de Ingressos */}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, isFree: false });
                    setUseTicketCategories(true);
                  }}
                  className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 w-full text-left ${
                    useTicketCategories
                      ? 'bg-neon-purple/10 border-neon-purple'
                      : 'bg-dark-800/50 border-dark-600 hover:border-dark-500 hover:bg-dark-700/50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    useTicketCategories
                      ? 'bg-neon-purple border-neon-purple'
                      : 'border-dark-500 bg-dark-700'
                  }`}>
                    {useTicketCategories && (
                      <CheckCircle size={16} className="text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={`font-medium ${useTicketCategories ? 'text-neon-purple' : 'text-white'}`}>
                      Categorias de ingressos
                    </span>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Camarote, VIP, Pista, etc.
                    </p>
                  </div>
                  {useTicketCategories && (
                    <Ticket size={20} className="text-neon-purple" />
                  )}
                </button>

                {/* Campo de preço único */}
                {!useTicketCategories && !formData.isFree && (
                  <div className="mt-4 p-4 bg-dark-800/50 rounded-xl border border-dark-600">
                    <label htmlFor="price" className="input-label flex items-center gap-2">
                      <DollarSign size={16} className="text-neon-green" />
                      Valor da Entrada *
                    </label>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      min={0}
                      step={0.01}
                        placeholder="0,00"
                        className={`input-field pl-12 text-lg font-semibold ${errors.price ? 'border-red-500' : ''}`}
                    />
                    </div>
                    {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                  </div>
                )}

                {useTicketCategories && (
                  <div className="mt-4 space-y-4">
                    <div className="p-3 bg-dark-800 rounded-lg border border-dark-600">
                      <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                        <Ticket size={18} className="text-neon-pink" />
                        Adicionar Categoria de Ingresso
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="input-label text-sm">Nome da Categoria *</label>
                          <input
                            type="text"
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                            placeholder="Ex: Camarote, VIP, Pista Premium"
                            className="input-field text-sm"
                          />
                        </div>
                        <div>
                          <label className="input-label text-sm">Preço (R$) *</label>
                          <input
                            type="number"
                            value={categoryForm.price}
                            onChange={(e) => setCategoryForm({ ...categoryForm, price: e.target.value })}
                            min={0}
                            step={0.01}
                            placeholder="Ex: 150.00"
                            className="input-field text-sm"
                          />
                        </div>
                        <div>
                          <label className="input-label text-sm">Quantidade (Estoque) *</label>
                          <input
                            type="number"
                            value={categoryForm.stockTotal}
                            onChange={(e) => setCategoryForm({ ...categoryForm, stockTotal: e.target.value })}
                            min={1}
                            placeholder="Ex: 50"
                            className="input-field text-sm"
                          />
                        </div>
                        <div>
                          <label className="input-label text-sm">Descrição (opcional)</label>
                          <input
                            type="text"
                            value={categoryForm.description}
                            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                            placeholder="Ex: Acesso exclusivo ao camarote"
                            className="input-field text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addCategory}
                          className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                        >
                          <Plus size={16} />
                          {editingCategoryIndex !== null ? 'Atualizar' : 'Adicionar'} Categoria
                        </button>
                        {editingCategoryIndex !== null && (
                          <button
                            type="button"
                            onClick={cancelEditCategory}
                            className="btn-secondary text-sm py-2 px-4"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lista de categorias adicionadas */}
                    {ticketCategories.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-white font-medium text-sm">Categorias Adicionadas:</h4>
                        {ticketCategories.map((cat, index) => (
                          <div
                            key={index}
                            className="p-3 bg-dark-800 rounded-lg border border-dark-600 flex items-center justify-between"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-medium">{cat.name}</span>
                                <span className="text-neon-green font-semibold">
                                  R$ {cat.price.toFixed(2)}
                                </span>
                              </div>
                              <div className="text-xs text-gray-400">
                                Estoque: {cat.stockTotal} ingressos
                                {cat.description && ` • ${cat.description}`}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => editCategory(index)}
                                className="p-2 text-neon-blue hover:bg-dark-700 rounded"
                                title="Editar"
                              >
                                <Info size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeCategory(index)}
                                className="p-2 text-red-500 hover:bg-dark-700 rounded"
                                title="Remover"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Imagem de capa */}
            <div className="card">
              <h2 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
                <ImageIcon size={20} className="text-neon-pink" />
                Imagem de Capa
              </h2>

              <div className="space-y-4">
                {/* Botão de Upload */}
                <div>
                  <label className="input-label mb-2 block">
                    Enviar Imagem
                  </label>
                  <label
                    htmlFor="imageUpload"
                    className={`flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                      isUploadingImage
                        ? 'border-neon-blue bg-neon-blue/10 cursor-wait'
                        : 'border-neon-pink/50 bg-dark-800 hover:border-neon-pink hover:bg-dark-700'
                    }`}
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 size={20} className="text-neon-blue animate-spin" />
                        <span className="text-neon-blue">Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={20} className="text-neon-pink" />
                        <span className="text-gray-300">Clique para fazer upload</span>
                      </>
                    )}
                  </label>
                  <input
                    type="file"
                    id="imageUpload"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploadingImage}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Formatos aceitos: JPG, PNG, WEBP (máx. 5MB)
                  </p>
                </div>

                {/* Divisor OU */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dark-600"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-dark-800 px-2 text-gray-500">ou</span>
                  </div>
                </div>

                {/* Campo de URL */}
                <div>
                  <label htmlFor="coverImage" className="input-label">
                    URL da Imagem
                  </label>
                  <input
                    type="url"
                    id="coverImage"
                    name="coverImage"
                    value={formData.coverImage}
                    onChange={handleChange}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className={`input-field ${errors.coverImage ? 'border-red-500' : ''}`}
                    maxLength={500}
                  />
                  {errors.coverImage && (
                    <p className="text-red-500 text-sm mt-1">{errors.coverImage}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Deixe vazio para usar uma imagem padrao
                  </p>
                </div>

                {/* Preview */}
                {(formData.coverImage || imagePreview) && (
                  <div className="relative h-48 rounded-lg overflow-hidden border border-dark-600">
                    <img
                      src={imagePreview || formData.coverImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800';
                      }}
                    />
                    {(formData.coverImage || imagePreview) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, coverImage: '' }));
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-dark-900/80 hover:bg-dark-900 rounded-full transition-colors"
                        title="Remover imagem"
                      >
                        <X size={18} className="text-white" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Botoes */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-ghost flex-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || isSubmitting}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {(isLoading || isSubmitting) ? (
                  <>
                    <span className="loading-spinner w-5 h-5 mr-2" />
                    {isEditing ? 'Salvando...' : 'Criando...'}
                  </>
                ) : (
                  isEditing ? 'Salvar Alteracoes' : 'Cadastrar Festa'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

