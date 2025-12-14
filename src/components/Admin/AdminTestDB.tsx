'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Activity,
  Server,
  Clock,
  Users,
  Calendar,
  Shield,
  AlertTriangle
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'loading';
  message: string;
  time?: number;
  data?: any;
}

export default function AdminTestDB() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  const runTest = async (testName: string, testFn: () => Promise<any>): Promise<TestResult> => {
    const startTime = performance.now();
    
    try {
      const result = await testFn();
      const endTime = performance.now();
      
      return {
        name: testName,
        status: 'success',
        message: 'Teste passou com sucesso',
        time: Math.round(endTime - startTime),
        data: result
      };
    } catch (error: any) {
      const endTime = performance.now();
      
      return {
        name: testName,
        status: 'error',
        message: error.message || 'Erro desconhecido',
        time: Math.round(endTime - startTime)
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setOverallStatus('running');
    setTests([]);

    const testResults: TestResult[] = [];

    // Teste 1: Conexão com Supabase
    testResults.push({
      name: 'Conexão com Supabase',
      status: 'loading',
      message: 'Testando conexão...'
    });
    setTests([...testResults]);

    const connectionTest = await runTest('Conexão com Supabase', async () => {
      const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
      if (error) throw error;
      return { connected: true };
    });
    testResults[0] = connectionTest;
    setTests([...testResults]);

    // Teste 2: Acesso à tabela user_profiles
    testResults.push({
      name: 'Acesso à tabela user_profiles',
      status: 'loading',
      message: 'Testando acesso...'
    });
    setTests([...testResults]);

    const userProfilesTest = await runTest('Acesso à tabela user_profiles', async () => {
      const { data, error, count } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) throw error;
      return { count: count || 0, hasData: (data?.length || 0) > 0 };
    });
    testResults[1] = userProfilesTest;
    setTests([...testResults]);

    // Teste 3: Acesso à tabela events
    testResults.push({
      name: 'Acesso à tabela events',
      status: 'loading',
      message: 'Testando acesso...'
    });
    setTests([...testResults]);

    const eventsTest = await runTest('Acesso à tabela events', async () => {
      const { data, error, count } = await supabase
        .from('events')
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) throw error;
      return { count: count || 0, hasData: (data?.length || 0) > 0 };
    });
    testResults[2] = eventsTest;
    setTests([...testResults]);

    // Teste 4: Acesso à tabela role_permissions
    testResults.push({
      name: 'Acesso à tabela role_permissions',
      status: 'loading',
      message: 'Testando acesso...'
    });
    setTests([...testResults]);

    const permissionsTest = await runTest('Acesso à tabela role_permissions', async () => {
      const { data, error, count } = await supabase
        .from('role_permissions')
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) throw error;
      return { count: count || 0, hasData: (data?.length || 0) > 0 };
    });
    testResults[3] = permissionsTest;
    setTests([...testResults]);

    // Teste 5: Performance - Query simples
    testResults.push({
      name: 'Performance - Query simples',
      status: 'loading',
      message: 'Testando performance...'
    });
    setTests([...testResults]);

    const performanceTest = await runTest('Performance - Query simples', async () => {
      const start = performance.now();
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, name, email')
        .limit(10);
      
      const end = performance.now();
      
      if (error) throw error;
      return { 
        queryTime: Math.round(end - start),
        recordsReturned: data?.length || 0
      };
    });
    testResults[4] = performanceTest;
    setTests([...testResults]);

    // Teste 6: Verificar autenticação atual
    testResults.push({
      name: 'Verificar sessão atual',
      status: 'loading',
      message: 'Verificando sessão...'
    });
    setTests([...testResults]);

    const sessionTest = await runTest('Verificar sessão atual', async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      return { 
        hasSession: !!session,
        userId: session?.user?.id || null,
        email: session?.user?.email || null
      };
    });
    testResults[5] = sessionTest;
    setTests([...testResults]);

    setIsRunning(false);

    // Determina status geral
    const hasErrors = testResults.some(t => t.status === 'error');
    const allPassed = testResults.every(t => t.status === 'success');
    
    setOverallStatus(hasErrors ? 'error' : allPassed ? 'success' : 'idle');
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} className="text-neon-green" />;
      case 'error':
        return <XCircle size={20} className="text-red-400" />;
      case 'loading':
        return <Loader2 size={20} className="text-neon-blue animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-neon-green/50 bg-neon-green/5';
      case 'error':
        return 'border-red-500/50 bg-red-500/5';
      case 'loading':
        return 'border-neon-blue/50 bg-neon-blue/5';
      default:
        return 'border-dark-600 bg-dark-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
            <Database size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-white">
              Teste de Banco de Dados
            </h1>
            <p className="text-gray-400 text-sm">
              Verifique a conexão e o acesso às tabelas do Supabase
            </p>
          </div>
        </div>
      </div>

      {/* Status Geral */}
      {overallStatus !== 'idle' && (
        <div className={`card border-2 ${
          overallStatus === 'success' 
            ? 'border-neon-green/50 bg-neon-green/5' 
            : overallStatus === 'error'
            ? 'border-red-500/50 bg-red-500/5'
            : 'border-neon-blue/50 bg-neon-blue/5'
        }`}>
          <div className="flex items-center gap-3">
            {overallStatus === 'success' && <CheckCircle size={24} className="text-neon-green" />}
            {overallStatus === 'error' && <XCircle size={24} className="text-red-400" />}
            {overallStatus === 'running' && <Loader2 size={24} className="text-neon-blue animate-spin" />}
            <div>
              <h2 className="font-display font-bold text-lg text-white">
                {overallStatus === 'success' && 'Todos os testes passaram!'}
                {overallStatus === 'error' && 'Alguns testes falharam'}
                {overallStatus === 'running' && 'Executando testes...'}
              </h2>
              <p className="text-gray-400 text-sm">
                {overallStatus === 'success' && 'O banco de dados está funcionando corretamente'}
                {overallStatus === 'error' && 'Verifique os erros abaixo'}
                {overallStatus === 'running' && 'Aguarde enquanto os testes são executados'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botão de Execução */}
      <div className="card">
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="w-full px-6 py-4 bg-gradient-to-r from-neon-blue to-cyan-600 hover:from-neon-blue/80 hover:to-cyan-600/80 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Executando testes...
            </>
          ) : (
            <>
              <Activity size={20} />
              Executar Todos os Testes
            </>
          )}
        </button>
      </div>

      {/* Resultados dos Testes */}
      {tests.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <Server size={20} />
            Resultados dos Testes
          </h2>
          
          {tests.map((test, index) => (
            <div
              key={index}
              className={`card border-2 ${getStatusColor(test.status)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(test.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{test.name}</h3>
                    <p className={`text-sm ${
                      test.status === 'success' 
                        ? 'text-neon-green' 
                        : test.status === 'error'
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }`}>
                      {test.message}
                    </p>
                    {test.data && (
                      <div className="mt-2 p-2 bg-dark-900 rounded text-xs font-mono text-gray-300">
                        <pre>{JSON.stringify(test.data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
                {test.time !== undefined && (
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Clock size={14} />
                    <span>{test.time}ms</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Informações do Banco */}
      <div className="card bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-400 mb-1">Informações</h3>
            <p className="text-sm text-gray-400">
              Estes testes verificam a conectividade básica com o Supabase e o acesso às principais tabelas. 
              Eles não modificam dados, apenas leem informações para validar a configuração.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

