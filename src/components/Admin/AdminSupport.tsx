'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Headphones, Ticket, BookOpen, MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminSupport() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'tickets' | 'knowledge'>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    // TODO: Buscar tickets do banco de dados
    setTimeout(() => {
      setTickets([]);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleCloseTicket = async (ticketId: string) => {
    try {
      // TODO: Implementar fechamento de ticket
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: 'closed' } : t));
      showToast('Ticket fechado com sucesso.', 'success');
    } catch (error) {
      showToast('Erro ao fechar ticket.', 'error');
    }
  };

  const handleAssignTicket = async (ticketId: string, assignTo: string) => {
    try {
      // TODO: Implementar atribuição de ticket
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, assignedTo: assignTo, status: 'in_progress' } : t));
      showToast('Ticket atribuído com sucesso.', 'success');
    } catch (error) {
      showToast('Erro ao atribuir ticket.', 'error');
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filterStatus === 'all') return true;
    return ticket.status === filterStatus;
  });

  const tabs = [
    { id: 'tickets' as const, label: 'Tickets de Suporte', icon: Ticket },
    { id: 'knowledge' as const, label: 'Base de Conhecimento', icon: BookOpen },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed': return 'bg-green-500/20 text-green-400';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
            <Headphones size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-white">
              Painel de Suporte
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm">
              Gerencie tickets e base de conhecimento
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-2 border-b border-dark-600">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  isActive
                    ? 'border-green-400 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo das Tabs */}
      <div className="card">
        {activeTab === 'tickets' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                    : 'bg-dark-700 border border-dark-600 text-gray-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('open')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  filterStatus === 'open'
                    ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                    : 'bg-dark-700 border border-dark-600 text-gray-400 hover:text-white'
                }`}
              >
                Abertos
              </button>
              <button
                onClick={() => setFilterStatus('in_progress')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  filterStatus === 'in_progress'
                    ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                    : 'bg-dark-700 border border-dark-600 text-gray-400 hover:text-white'
                }`}
              >
                Em Andamento
              </button>
              <button
                onClick={() => setFilterStatus('resolved')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  filterStatus === 'resolved'
                    ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                    : 'bg-dark-700 border border-dark-600 text-gray-400 hover:text-white'
                }`}
              >
                Resolvidos
              </button>
            </div>

            {/* Lista de Tickets */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Carregando tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12">
                <Ticket size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">Nenhum ticket encontrado.</p>
                <p className="text-gray-500 text-sm mt-2">
                  O sistema de tickets será implementado em breve.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 bg-dark-700 rounded-lg border border-dark-600"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs rounded border ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority === 'urgent' ? 'Urgente' : 
                             ticket.priority === 'high' ? 'Alta' :
                             ticket.priority === 'medium' ? 'Média' : 'Baixa'}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${getStatusColor(ticket.status)}`}>
                            {ticket.status === 'open' ? 'Aberto' :
                             ticket.status === 'in_progress' ? 'Em Andamento' :
                             ticket.status === 'resolved' ? 'Resolvido' : 'Fechado'}
                          </span>
                        </div>
                        <h3 className="font-bold text-white mb-1">{ticket.subject}</h3>
                        <p className="text-sm text-gray-400 mb-2">
                          Por: {ticket.userName} ({ticket.userEmail})
                        </p>
                        <p className="text-sm text-gray-300">{ticket.description}</p>
                        {ticket.assignedTo && (
                          <p className="text-xs text-gray-500 mt-2">
                            Atribuído para: {ticket.assignedTo}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleCloseTicket(ticket.id)}
                        className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 rounded-lg transition-colors text-sm"
                      >
                        Fechar Ticket
                      </button>
                      {!ticket.assignedTo && (
                        <button
                          onClick={() => handleAssignTicket(ticket.id, 'Eu')}
                          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 rounded-lg transition-colors text-sm"
                        >
                          Atribuir para Mim
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="space-y-4">
            <h2 className="font-display font-bold text-lg text-white mb-4">
              Base de Conhecimento
            </h2>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-400 text-sm mb-2">
                Funcionalidades da base de conhecimento:
              </p>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                <li>Acessar artigos de ajuda</li>
                <li>Sugerir melhorias na documentação</li>
                <li>Criar artigos de ajuda básicos</li>
                <li>Atualizar FAQs</li>
              </ul>
              <p className="text-gray-400 text-sm mt-4">
                Esta funcionalidade será implementada em breve.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

