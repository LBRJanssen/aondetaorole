'use client';

import Layout from '@/components/Layout';
import { FileText, Shield, Cookie, AlertTriangle } from 'lucide-react';

export default function TermosPage() {
  return (
    <Layout>
      <div className="container-app py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="font-display font-bold text-4xl text-white mb-4">
              Termos de <span className="text-neon-pink">Uso</span>
            </h1>
            <p className="text-gray-400">
              Ultima atualizacao: Dezembro de 2024
            </p>
          </div>

          {/* Navegacao */}
          <div className="card mb-8">
            <h3 className="font-display font-bold text-white mb-4">Indice</h3>
            <nav className="space-y-2">
              <a href="#termos" className="block text-neon-blue hover:underline">1. Termos de Uso</a>
              <a href="#privacidade" className="block text-neon-blue hover:underline">2. Politica de Privacidade</a>
              <a href="#cookies" className="block text-neon-blue hover:underline">3. Politica de Cookies</a>
              <a href="#responsabilidade" className="block text-neon-blue hover:underline">4. Limitacao de Responsabilidade</a>
            </nav>
          </div>

          {/* Termos de Uso */}
          <section id="termos" className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <FileText size={28} className="text-neon-pink" />
              <h2 className="font-display font-bold text-2xl text-white">1. Termos de Uso</h2>
            </div>

            <div className="prose prose-invert max-w-none space-y-4 text-gray-300">
              <h3 className="text-white font-semibold">1.1 Aceitacao dos Termos</h3>
              <p>
                Ao acessar e utilizar a plataforma "Aonde Ta o Role", voce concorda em cumprir e estar 
                vinculado a estes Termos de Uso. Se voce nao concordar com qualquer parte destes termos, 
                nao devera utilizar nossa plataforma.
              </p>

              <h3 className="text-white font-semibold">1.2 Descricao do Servico</h3>
              <p>
                A plataforma "Aonde Ta o Role" e um servico de descoberta de eventos e festas que permite 
                aos usuarios visualizar, cadastrar e interagir com eventos em tempo real atraves de 
                geolocalizacao.
              </p>

              <h3 className="text-white font-semibold">1.3 Cadastro e Conta</h3>
              <p>
                Para utilizar algumas funcionalidades da plataforma, voce devera criar uma conta fornecendo 
                informacoes verdadeiras e atualizadas. Voce e responsavel por manter a confidencialidade 
                de sua senha e por todas as atividades realizadas em sua conta.
              </p>

              <h3 className="text-white font-semibold">1.4 Uso Aceitavel</h3>
              <p>Ao utilizar nossa plataforma, voce concorda em:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Nao cadastrar eventos falsos ou enganosos</li>
                <li>Nao utilizar a plataforma para atividades ilegais</li>
                <li>Nao violar direitos de terceiros</li>
                <li>Nao tentar burlar sistemas de seguranca</li>
                <li>Fornecer informacoes verdadeiras sobre eventos</li>
              </ul>

              <h3 className="text-white font-semibold">1.5 Sistema de Boosts</h3>
              <p>
                Os boosts sao uma forma de destacar eventos na plataforma. Cada boost custa R$ 0,20 
                e aumenta a visibilidade do evento no ranking e no mapa. Os boosts sao nao reembolsaveis 
                apos a compra.
              </p>

              <h3 className="text-white font-semibold">1.6 Plano Premium</h3>
              <p>
                O plano Premium oferece funcionalidades adicionais para organizadores de eventos. 
                A assinatura e recorrente e pode ser cancelada a qualquer momento. O cancelamento 
                nao da direito a reembolso proporcional.
              </p>
            </div>
          </section>

          {/* Privacidade */}
          <section id="privacidade" className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Shield size={28} className="text-neon-blue" />
              <h2 className="font-display font-bold text-2xl text-white">2. Politica de Privacidade</h2>
            </div>

            <div className="prose prose-invert max-w-none space-y-4 text-gray-300">
              <h3 className="text-white font-semibold">2.1 Dados Coletados</h3>
              <p>Coletamos os seguintes tipos de dados:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Dados de cadastro:</strong> nome, email, telefone (opcional)</li>
                <li><strong>Dados de localizacao:</strong> coordenadas GPS quando autorizado</li>
                <li><strong>Dados de uso:</strong> interacoes com eventos, historico de navegacao</li>
                <li><strong>Dados de pagamento:</strong> processados por terceiros (nao armazenamos dados de cartao)</li>
              </ul>

              <h3 className="text-white font-semibold">2.2 Uso dos Dados</h3>
              <p>Utilizamos seus dados para:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fornecer e melhorar nossos servicos</li>
                <li>Personalizar sua experiencia</li>
                <li>Enviar comunicacoes relevantes (com seu consentimento)</li>
                <li>Processar transacoes</li>
                <li>Garantir seguranca da plataforma</li>
              </ul>

              <h3 className="text-white font-semibold">2.3 Compartilhamento de Dados</h3>
              <p>
                Nao vendemos seus dados pessoais. Podemos compartilhar dados com:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Organizadores de eventos (apenas dados publicos como presenca)</li>
                <li>Prestadores de servicos (processadores de pagamento, hospedagem)</li>
                <li>Autoridades legais quando exigido por lei</li>
              </ul>

              <h3 className="text-white font-semibold">2.4 Seus Direitos</h3>
              <p>Voce tem direito a:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incorretos</li>
                <li>Solicitar exclusao de dados</li>
                <li>Revogar consentimentos</li>
                <li>Exportar seus dados</li>
              </ul>

              <h3 className="text-white font-semibold">2.5 Seguranca</h3>
              <p>
                Implementamos medidas de seguranca tecnicas e organizacionais para proteger seus dados, 
                incluindo criptografia, controle de acesso e monitoramento de seguranca.
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section id="cookies" className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Cookie size={28} className="text-neon-green" />
              <h2 className="font-display font-bold text-2xl text-white">3. Politica de Cookies</h2>
            </div>

            <div className="prose prose-invert max-w-none space-y-4 text-gray-300">
              <h3 className="text-white font-semibold">3.1 O que sao Cookies</h3>
              <p>
                Cookies sao pequenos arquivos de texto armazenados em seu dispositivo quando voce 
                visita nossa plataforma. Eles nos ajudam a melhorar sua experiencia.
              </p>

              <h3 className="text-white font-semibold">3.2 Tipos de Cookies Utilizados</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essenciais:</strong> necessarios para funcionamento basico</li>
                <li><strong>Funcionais:</strong> lembram suas preferencias</li>
                <li><strong>Analiticos:</strong> nos ajudam a entender como voce usa a plataforma</li>
                <li><strong>Marketing:</strong> usados para publicidade personalizada (com consentimento)</li>
              </ul>

              <h3 className="text-white font-semibold">3.3 Gerenciamento de Cookies</h3>
              <p>
                Voce pode gerenciar suas preferencias de cookies atraves das configuracoes do seu 
                navegador ou atraves do banner de cookies em nossa plataforma.
              </p>
            </div>
          </section>

          {/* Responsabilidade */}
          <section id="responsabilidade" className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle size={28} className="text-neon-orange" />
              <h2 className="font-display font-bold text-2xl text-white">4. Limitacao de Responsabilidade</h2>
            </div>

            <div className="prose prose-invert max-w-none space-y-4 text-gray-300">
              <h3 className="text-white font-semibold">4.1 Eventos de Terceiros</h3>
              <p>
                A plataforma "Aonde Ta o Role" e apenas um meio de divulgacao de eventos. 
                <strong> Nao somos responsaveis pelos eventos em si</strong>, sua organizacao, 
                seguranca ou qualidade. A responsabilidade e integralmente dos organizadores.
              </p>

              <h3 className="text-white font-semibold">4.2 Informacoes dos Eventos</h3>
              <p>
                As informacoes dos eventos sao fornecidas pelos organizadores. Nao garantimos 
                a veracidade, precisao ou atualizacao dessas informacoes. Recomendamos sempre 
                verificar com o organizador antes de comparecer.
              </p>

              <h3 className="text-white font-semibold">4.3 Conducao e Seguranca</h3>
              <p>
                A funcionalidade "a caminho" e apenas informativa. <strong>Nao incentivamos 
                o uso de celular enquanto dirige</strong>. Sempre priorize sua seguranca e 
                respeite as leis de transito.
              </p>

              <h3 className="text-white font-semibold">4.4 Denuncia de Eventos</h3>
              <p>
                Disponibilizamos um botao de denuncia para eventos que violem nossos termos ou 
                representem perigo. Nos comprometemos a analisar todas as denuncias, mas nao 
                garantimos acao imediata ou remocao automatica.
              </p>

              <h3 className="text-white font-semibold">4.5 Interrupcao do Servico</h3>
              <p>
                Nos reservamos o direito de interromper, modificar ou descontinuar qualquer 
                funcionalidade da plataforma a qualquer momento, sem aviso previo.
              </p>
            </div>
          </section>

          {/* Contato */}
          <div className="card-highlight">
            <h3 className="font-display font-bold text-lg text-white mb-2">Duvidas ou Solicitacoes?</h3>
            <p className="text-gray-400 mb-4">
              Para exercer seus direitos ou esclarecer duvidas sobre nossos termos, entre em contato:
            </p>
            <p className="text-neon-pink font-medium">contato@aondetaorole.com</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

