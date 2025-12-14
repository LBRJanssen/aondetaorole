'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { MessageSquare, AlertTriangle, User, FileText, TrendingUp } from 'lucide-react';

interface Report {
  id: string;
  type: 'event' | 'user';
  targetId: string;
  targetName: string;
  reason: string;
  description?: string;
  reporterEmail: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
}

export default function AdminModeration() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'stats'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Buscar denúncias do banco de dados
    // Por enquanto, dados mock
    setTimeout(() => {
      setReports([]);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleResolveReport = async (reportId: string) => {
    try {
      // TODO: Implementar resolução de denúncia
      setReports(reports.filter(r => r.id !== reportId));
      showToast('Denúncia marcada como resolvida.', 'success');
    } catch (error) {
      showToast('Erro ao resolver denúncia.', 'error');
    }
  };

  const handleEscalateReport = async (reportId: string) => {
    try {
      // TODO: Implementar escalação para Admin
      showToast('Denúncia escalada para Admin.', 'success');
    } catch (error) {
      showToast('Erro ao escalar denúncia.', 'error');
    }
  };

  const tabs = [
    { id: 'reports' as const, label: 'Denúncias', icon: AlertTriangle },
    { id: 'users' as const, label: 'Usuários Suspeitos', icon: User },
    { id: 'stats' as const, label: 'Estatísticas', icon: TrendingUp },
  ];

  return (
    <div>
      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <MessageSquare size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-white">
              Painel de Moderação
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm">
              Gerencie denúncias e mantenha a qualidade do conteúdo
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
                    ? 'border-blue-400 text-blue-400'
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
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg text-white">
                Denúncias Pendentes
              </h2>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                {reports.filter(r => r.status === 'pending').length} pendentes
              </span>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Carregando denúncias...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">Nenhuma denúncia encontrada.</p>
                <p className="text-gray-500 text-sm mt-2">
                  O sistema de denúncias será implementado em breve.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 bg-dark-700 rounded-lg border border-dark-600"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            report.type === 'event' 
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {report.type === 'event' ? 'Evento' : 'Usuário'}
                          </span>
                          <span className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-400">
                            {report.status === 'pending' ? 'Pendente' : report.status === 'reviewed' ? 'Revisado' : 'Resolvido'}
                          </span>
                        </div>
                        <h3 className="font-bold text-white mb-1">{report.targetName}</h3>
                        <p className="text-sm text-gray-400 mb-2">
                          Denunciado por: {report.reporterEmail}
                        </p>
                        <p className="text-sm text-gray-300 mb-2">
                          <strong>Motivo:</strong> {report.reason}
                        </p>
                        {report.description && (
                          <p className="text-sm text-gray-400">{report.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleResolveReport(report.id)}
                        className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 rounded-lg transition-colors text-sm"
                      >
                        Marcar como Resolvida
                      </button>
                      <button
                        onClick={() => handleEscalateReport(report.id)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-lg transition-colors text-sm"
                      >
                        Escalar para Admin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <h2 className="font-display font-bold text-lg text-white mb-4">
              Usuários com Histórico de Denúncias
            </h2>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-400 text-sm">
                Esta funcionalidade será implementada em breve.
                Você poderá ver usuários mais denunciados e suspender temporariamente.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4">
            <h2 className="font-display font-bold text-lg text-white mb-4">
              Estatísticas de Moderação
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card bg-gradient-to-br from-yellow-500/20 to-yellow-700/20 border-yellow-500/50">
                <p className="text-xs text-gray-400 mb-1">Denúncias Pendentes</p>
                <p className="text-2xl font-bold text-white">
                  {reports.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <div className="card bg-gradient-to-br from-green-500/20 to-green-700/20 border-green-500/50">
                <p className="text-xs text-gray-400 mb-1">Denúncias Resolvidas</p>
                <p className="text-2xl font-bold text-white">
                  {reports.filter(r => r.status === 'resolved').length}
                </p>
              </div>
              <div className="card bg-gradient-to-br from-blue-500/20 to-blue-700/20 border-blue-500/50">
                <p className="text-xs text-gray-400 mb-1">Total de Denúncias</p>
                <p className="text-2xl font-bold text-white">{reports.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

