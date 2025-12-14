'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Crown, Settings, Users, Shield, DollarSign, AlertTriangle, Save, ChevronDown, User, Sparkles, Zap, Calendar, Ticket, Image, MapPin, Bell, LayoutDashboard, Download, HeartHandshake, Palette, Info, HelpCircle } from 'lucide-react';

// Componente de Tooltip/Info
function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex ml-1">
      <HelpCircle size={14} className="text-gray-500 hover:text-gray-300 cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-xs text-gray-300 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 max-w-xs">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-dark-600" />
      </div>
    </div>
  );
}

// Componente de Input com Label e Info
interface ConfigInputProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  helpText?: string;
  placeholder?: string;
  accentColor?: string;
}

function ConfigInput({ label, icon, value, onChange, min = 0, helpText, placeholder, accentColor = 'text-gray-400' }: ConfigInputProps) {
  const [localValue, setLocalValue] = useState(value.toString());
  
  // Sincroniza quando o valor externo muda
  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Permite campo vazio para digitação
    if (inputValue === '') {
      setLocalValue('');
      return;
    }
    
    // Remove zeros à esquerda, exceto se for apenas "0"
    const cleanedValue = inputValue.replace(/^0+(?=\d)/, '');
    setLocalValue(cleanedValue);
    
    const numValue = parseInt(cleanedValue);
    if (!isNaN(numValue)) {
      onChange(Math.max(numValue, min));
    }
  };

  const handleBlur = () => {
    // Ao sair do campo, garante um valor válido
    if (localValue === '' || isNaN(parseInt(localValue))) {
      setLocalValue(min.toString());
      onChange(min);
    }
  };

  return (
    <div className="bg-dark-700/50 rounded-lg p-4 border border-dark-600 hover:border-dark-500 transition-colors">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
        <span className={accentColor}>{icon}</span>
        {label}
        {helpText && <InfoTooltip text={helpText} />}
      </label>
      <input
        type="number"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className="input-field w-full"
        min={min}
        placeholder={placeholder}
      />
    </div>
  );
}

// Componente de Toggle com descrição
interface ConfigToggleProps {
  label: string;
  description?: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accentColor?: string;
}

function ConfigToggle({ label, description, icon, checked, onChange, accentColor = 'text-gray-400' }: ConfigToggleProps) {
  return (
    <label className="flex items-start gap-4 p-4 bg-dark-700/50 rounded-lg border border-dark-600 hover:border-dark-500 transition-colors cursor-pointer group">
      <div className={`mt-0.5 ${accentColor}`}>{icon}</div>
      <div className="flex-1">
        <span className="text-gray-200 font-medium group-hover:text-white transition-colors">{label}</span>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-pink peer-checked:after:bg-white"></div>
      </div>
    </label>
  );
}

// Componente Accordion melhorado
interface AccordionProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badgeColor?: string;
  badge?: string;
}

function Accordion({ title, subtitle, icon, isOpen, onToggle, children, badgeColor = 'bg-gray-500', badge }: AccordionProps) {
  return (
    <div className={`border rounded-xl overflow-hidden transition-all duration-300 ${isOpen ? 'border-dark-500 shadow-lg' : 'border-dark-600'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 bg-dark-700 hover:bg-dark-650 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${badgeColor} flex items-center justify-center shadow-lg`}>
            {icon}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-white text-lg">{title}</span>
              {badge && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor} text-white font-medium`}>
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className={`w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown size={18} className="text-gray-400" />
        </div>
      </button>
      <div className={`transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-5 bg-dark-800 border-t border-dark-600">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AdminOwner() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'system' | 'roles' | 'security' | 'financial'>('system');
  const [isSaving, setIsSaving] = useState(false);

  // Accordions abertos
  const [openAccordions, setOpenAccordions] = useState({
    common: true,
    premium: false,
  });

  const toggleAccordion = (key: 'common' | 'premium') => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Configurações para Usuários Comuns
  const [commonConfig, setCommonConfig] = useState({
    maxEventsPerMonth: 3,
    maxPhotosPerEvent: 5,
    maxTicketCategories: 2,
    canUseLocation: true,
    canReceiveBoosts: true,
    maxGuestsPerEvent: 100,
    canSendNotifications: false,
  });

  // Configurações para Usuários Premium
  const [premiumConfig, setPremiumConfig] = useState({
    maxEventsPerMonth: 999,
    maxPhotosPerEvent: 20,
    maxTicketCategories: 10,
    canUseLocation: true,
    canReceiveBoosts: true,
    maxGuestsPerEvent: 10000,
    canSendNotifications: true,
    canAccessDashboard: true,
    canExportData: true,
    prioritySupport: true,
    customEventBranding: true,
  });

  // Configurações Globais
  const [globalConfig, setGlobalConfig] = useState({
    emailNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    maintenanceMode: false,
  });

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast('Configurações salvas com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao salvar configurações.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'system' as const, label: 'Configurações', icon: Settings },
    { id: 'roles' as const, label: 'Cargos', icon: Users },
    { id: 'security' as const, label: 'Segurança', icon: Shield },
    { id: 'financial' as const, label: 'Financeiro', icon: DollarSign },
  ];

  return (
    <div>
      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <Crown size={28} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">
              Painel Owner
            </h1>
            <p className="text-gray-400 text-sm">
              Gerencie todas as configurações do sistema em um só lugar
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card mb-6 p-2">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-yellow-500/20 text-yellow-400 shadow-lg'
                    : 'text-gray-400 hover:bg-dark-700 hover:text-white'
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
      <div className="space-y-6">
        {activeTab === 'system' && (
          <>
            {/* Info Box */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
                  <p className="text-yellow-400 font-medium">Como funciona?</p>
                  <p className="text-gray-300 text-sm mt-1">
                    Configure os limites e permissões para cada tipo de usuário. As alterações afetam <strong>todos os usuários</strong> do tipo selecionado imediatamente após salvar.
                  </p>
                </div>
              </div>
            </div>
              
            {/* Accordions */}
              <div className="space-y-4">
              {/* Usuários Comuns */}
              <Accordion
                title="Usuários Comuns"
                subtitle="Configurações para contas gratuitas"
                icon={<User size={24} className="text-white" />}
                isOpen={openAccordions.common}
                onToggle={() => toggleAccordion('common')}
                badgeColor="bg-gray-600"
              >
                {/* Limites Numéricos */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Zap size={14} />
                    Limites de Uso
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ConfigInput
                      label="Eventos por Mês"
                      icon={<Calendar size={16} />}
                      value={commonConfig.maxEventsPerMonth}
                      onChange={(v) => setCommonConfig({ ...commonConfig, maxEventsPerMonth: v })}
                      helpText="Quantos eventos o usuário pode criar por mês"
                    />
                    <ConfigInput
                      label="Convidados por Evento"
                      icon={<Users size={16} />}
                      value={commonConfig.maxGuestsPerEvent}
                      onChange={(v) => setCommonConfig({ ...commonConfig, maxGuestsPerEvent: v })}
                      helpText="Capacidade máxima de participantes"
                    />
                    <ConfigInput
                      label="Fotos por Evento"
                      icon={<Image size={16} />}
                      value={commonConfig.maxPhotosPerEvent}
                      onChange={(v) => setCommonConfig({ ...commonConfig, maxPhotosPerEvent: v })}
                      helpText="Quantidade de fotos na galeria do evento"
                    />
                    <ConfigInput
                      label="Tipos de Ingresso"
                      icon={<Ticket size={16} />}
                      value={commonConfig.maxTicketCategories}
                      onChange={(v) => setCommonConfig({ ...commonConfig, maxTicketCategories: v })}
                      helpText="Ex: VIP, Pista, Camarote..."
                    />
                  </div>
                </div>

                {/* Permissões */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Shield size={14} />
                    Permissões
                  </h4>
                  <div className="space-y-3">
                    <ConfigToggle
                      label="Exibir no Mapa"
                      description="Evento aparece no mapa interativo da plataforma"
                      icon={<MapPin size={18} />}
                      checked={commonConfig.canUseLocation}
                      onChange={(v) => setCommonConfig({ ...commonConfig, canUseLocation: v })}
                    />
                    <ConfigToggle
                      label="Receber Boosts"
                      description="Outros usuários podem dar boost para destacar o evento"
                      icon={<Zap size={18} />}
                      checked={commonConfig.canReceiveBoosts}
                      onChange={(v) => setCommonConfig({ ...commonConfig, canReceiveBoosts: v })}
                    />
                    <ConfigToggle
                      label="Enviar Notificações"
                      description="Enviar avisos e atualizações para os participantes confirmados"
                      icon={<Bell size={18} />}
                      checked={commonConfig.canSendNotifications}
                      onChange={(v) => setCommonConfig({ ...commonConfig, canSendNotifications: v })}
                    />
                  </div>
                </div>
              </Accordion>

              {/* Usuários Premium */}
              <Accordion
                title="Usuários Premium"
                subtitle="Configurações para assinantes pagos"
                icon={<Crown size={24} className="text-white" />}
                isOpen={openAccordions.premium}
                onToggle={() => toggleAccordion('premium')}
                badgeColor="bg-gradient-to-br from-neon-purple to-neon-pink"
                badge="PRO"
              >
                {/* Limites Numéricos */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-neon-purple uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Zap size={14} />
                    Limites de Uso
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ConfigInput
                      label="Eventos por Mês"
                      icon={<Calendar size={16} />}
                      value={premiumConfig.maxEventsPerMonth}
                      onChange={(v) => setPremiumConfig({ ...premiumConfig, maxEventsPerMonth: v })}
                      helpText="Use 999 para ilimitado"
                      placeholder="999 = Ilimitado"
                      accentColor="text-neon-purple"
                    />
                    <ConfigInput
                      label="Convidados por Evento"
                      icon={<Users size={16} />}
                      value={premiumConfig.maxGuestsPerEvent}
                      onChange={(v) => setPremiumConfig({ ...premiumConfig, maxGuestsPerEvent: v })}
                      helpText="Capacidade máxima de participantes"
                      accentColor="text-neon-purple"
                    />
                    <ConfigInput
                      label="Fotos por Evento"
                      icon={<Image size={16} />}
                      value={premiumConfig.maxPhotosPerEvent}
                      onChange={(v) => setPremiumConfig({ ...premiumConfig, maxPhotosPerEvent: v })}
                      helpText="Quantidade de fotos na galeria do evento"
                      accentColor="text-neon-purple"
                    />
                    <ConfigInput
                      label="Tipos de Ingresso"
                      icon={<Ticket size={16} />}
                      value={premiumConfig.maxTicketCategories}
                      onChange={(v) => setPremiumConfig({ ...premiumConfig, maxTicketCategories: v })}
                      helpText="Ex: VIP, Pista, Camarote..."
                      accentColor="text-neon-purple"
                  />
                  </div>
                </div>

                {/* Permissões Básicas */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-neon-purple uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Shield size={14} />
                    Permissões Básicas
                  </h4>
                  <div className="space-y-3">
                    <ConfigToggle
                      label="Exibir no Mapa"
                      description="Evento aparece no mapa interativo da plataforma"
                      icon={<MapPin size={18} />}
                      checked={premiumConfig.canUseLocation}
                      onChange={(v) => setPremiumConfig({ ...premiumConfig, canUseLocation: v })}
                      accentColor="text-neon-purple"
                    />
                    <ConfigToggle
                      label="Receber Boosts"
                      description="Outros usuários podem dar boost para destacar o evento"
                      icon={<Zap size={18} />}
                      checked={premiumConfig.canReceiveBoosts}
                      onChange={(v) => setPremiumConfig({ ...premiumConfig, canReceiveBoosts: v })}
                      accentColor="text-neon-purple"
                    />
                    <ConfigToggle
                      label="Enviar Notificações"
                      description="Enviar avisos e atualizações para os participantes confirmados"
                      icon={<Bell size={18} />}
                      checked={premiumConfig.canSendNotifications}
                      onChange={(v) => setPremiumConfig({ ...premiumConfig, canSendNotifications: v })}
                      accentColor="text-neon-purple"
                  />
                  </div>
                </div>

                {/* Recursos Exclusivos Premium */}
                <div>
                  <h4 className="text-sm font-semibold text-neon-pink uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Sparkles size={14} />
                    Recursos Exclusivos Premium
                  </h4>
                  <div className="space-y-3">
                    <ConfigToggle
                      label="Acesso ao Dashboard"
                      description="Painel completo com estatísticas e métricas dos eventos"
                      icon={<LayoutDashboard size={18} />}
                      checked={premiumConfig.canAccessDashboard}
                      onChange={(v) => setPremiumConfig({ ...premiumConfig, canAccessDashboard: v })}
                      accentColor="text-neon-pink"
                    />
                    <ConfigToggle
                      label="Exportar Dados"
                      description="Baixar relatórios e listas de participantes em Excel/PDF"
                      icon={<Download size={18} />}
                      checked={premiumConfig.canExportData}
                      onChange={(v) => setPremiumConfig({ ...premiumConfig, canExportData: v })}
                      accentColor="text-neon-pink"
                  />
                    <ConfigToggle
                      label="Suporte Prioritário"
                      description="Atendimento mais rápido e canais exclusivos de suporte"
                      icon={<HeartHandshake size={18} />}
                      checked={premiumConfig.prioritySupport}
                      onChange={(v) => setPremiumConfig({ ...premiumConfig, prioritySupport: v })}
                      accentColor="text-neon-pink"
                    />
                    <ConfigToggle
                      label="Personalização de Eventos"
                      description="Cores, logos e temas personalizados para o evento"
                      icon={<Palette size={18} />}
                      checked={premiumConfig.customEventBranding}
                      onChange={(v) => setPremiumConfig({ ...premiumConfig, customEventBranding: v })}
                      accentColor="text-neon-pink"
                    />
                  </div>
                </div>
              </Accordion>
                </div>

            {/* Configurações Globais */}
            <div className="card">
              <h3 className="font-display font-bold text-lg text-white mb-2">Configurações Globais</h3>
              <p className="text-sm text-gray-400 mb-6">Afetam todos os usuários da plataforma</p>
              
              <div className="space-y-3">
                <ConfigToggle
                  label="Notificações por Email"
                  description="Sistema envia emails para usuários (confirmações, lembretes, etc)"
                  icon={<Bell size={18} />}
                  checked={globalConfig.emailNotificationsEnabled}
                  onChange={(v) => setGlobalConfig({ ...globalConfig, emailNotificationsEnabled: v })}
                  accentColor="text-yellow-400"
                  />
                <ConfigToggle
                  label="Notificações Push"
                  description="Notificações no navegador e app mobile"
                  icon={<Bell size={18} />}
                  checked={globalConfig.pushNotificationsEnabled}
                  onChange={(v) => setGlobalConfig({ ...globalConfig, pushNotificationsEnabled: v })}
                  accentColor="text-yellow-400"
                />
                <div className="pt-2">
                  <ConfigToggle
                    label="Modo de Manutenção"
                    description="⚠️ Bloqueia a criação de novos eventos (use apenas em emergências)"
                    icon={<AlertTriangle size={18} />}
                    checked={globalConfig.maintenanceMode}
                    onChange={(v) => setGlobalConfig({ ...globalConfig, maintenanceMode: v })}
                    accentColor="text-red-400"
                  />
                </div>
                </div>
              </div>

            {/* Botão Salvar */}
            <div className="flex justify-end">
                <button
                onClick={handleSaveConfig}
                  disabled={isSaving}
                className="btn-primary px-8 py-3 flex items-center gap-2 text-base font-semibold shadow-lg shadow-neon-pink/20"
                >
                  {isSaving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                    <Save size={20} />
                    Salvar Todas as Configurações
                    </>
                  )}
                </button>
              </div>
          </>
        )}

        {activeTab === 'roles' && (
          <div className="card">
              <h2 className="font-display font-bold text-lg text-white mb-4">
                Gerenciar Cargos de Usuários
              </h2>
              <p className="text-gray-400 text-sm mb-4">
              Como Owner, você é o único que pode promover usuários para cargos administrativos.
            </p>
            
            {/* Hierarquia de Cargos */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <Crown size={20} className="text-yellow-400" />
                <div>
                  <span className="text-yellow-400 font-medium">Owner</span>
                  <p className="text-xs text-gray-400">Acesso total ao sistema</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <Shield size={20} className="text-red-400" />
                <div>
                  <span className="text-red-400 font-medium">Admin</span>
                  <p className="text-xs text-gray-400">Gerencia eventos e usuários</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <Shield size={20} className="text-blue-400" />
                <div>
                  <span className="text-blue-400 font-medium">Moderação</span>
                  <p className="text-xs text-gray-400">Modera eventos e denúncias</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <HeartHandshake size={20} className="text-emerald-400" />
                <div>
                  <span className="text-emerald-400 font-medium">Suporte</span>
                  <p className="text-xs text-gray-400">Atende usuários e tickets</p>
                </div>
              </div>
            </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                  <p className="text-yellow-400 font-medium mb-1">Como alterar cargos?</p>
                    <p className="text-gray-300 text-sm">
                    Vá até a seção <strong>"Usuários"</strong> no menu lateral, encontre o usuário desejado e clique em <strong>"Editar"</strong> para alterar o cargo.
                    </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="card">
              <h2 className="font-display font-bold text-lg text-white mb-4">
                Configurações de Segurança
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                Gerencie políticas de segurança, logs e auditoria do sistema.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-400 text-sm font-medium mb-2">
                🚧 Em desenvolvimento
                </p>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                  <li>Visualizar logs de segurança</li>
                  <li>Configurar políticas RLS</li>
                  <li>Configurar rate limiting</li>
                  <li>Auditoria completa do sistema</li>
                </ul>
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="card">
              <h2 className="font-display font-bold text-lg text-white mb-4">
                Configurações Financeiras
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                Configure preços, comissões e gerencie reembolsos.
              </p>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-400 text-sm font-medium mb-2">
                🚧 Em desenvolvimento
                </p>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                  <li>Configurar preços de boosts</li>
                  <li>Definir comissões</li>
                  <li>Gerenciar reembolsos</li>
                  <li>Exportar relatórios financeiros</li>
                </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
