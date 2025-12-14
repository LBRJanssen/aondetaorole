'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Terminal, 
  Play, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Code,
  Database,
  Users,
  Calendar,
  Shield,
  Star,
  List
} from 'lucide-react';

interface QueryResult {
  data: any[] | null;
  error: string | null;
  count: number;
  time: number;
}

// Queries rápidas pré-definidas
const quickQueries = [
  { 
    label: 'Listar Usuários (5)', 
    query: 'SELECT * FROM user_profiles ORDER BY created_at DESC LIMIT 5',
    icon: Users 
  },
  { 
    label: 'Contar Usuários', 
    query: 'SELECT COUNT(*) FROM user_profiles',
    icon: Users 
  },
  { 
    label: 'Listar Eventos (5)', 
    query: 'SELECT * FROM events ORDER BY created_at DESC LIMIT 5',
    icon: Calendar 
  },
  { 
    label: 'Contar Eventos', 
    query: 'SELECT COUNT(*) FROM events',
    icon: Calendar 
  },
  { 
    label: 'Permissões', 
    query: 'SELECT * FROM role_permissions ORDER BY role, permission',
    icon: Shield 
  },
  { 
    label: 'Usuários Premium', 
    query: "SELECT id, name, email, user_type, is_premium, premium_expires_at FROM user_profiles WHERE is_premium = true",
    icon: Star 
  },
  { 
    label: 'Admins', 
    query: "SELECT id, name, email, user_type FROM user_profiles WHERE user_type IN ('owner', 'admin', 'moderacao', 'suporte') ORDER BY user_type",
    icon: Shield 
  },
];

export default function AdminQuerySQL() {
  const [query, setQuery] = useState('SELECT COUNT(*) FROM user_profiles');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const executeQuery = async (customQuery?: string) => {
    const queryToRun = customQuery || query;
    
    if (!queryToRun.trim()) {
      setResult({
        data: null,
        error: 'Query não pode estar vazia',
        count: 0,
        time: 0
      });
      return;
    }

    setIsLoading(true);
    const startTime = performance.now();

    try {
      // Usa RPC para executar query personalizada (precisa criar a função no Supabase)
      // Por segurança, vamos usar o método select para queries SELECT
      const queryLower = queryToRun.trim().toLowerCase();
      
      if (!queryLower.startsWith('select')) {
        setResult({
          data: null,
          error: '⚠️ Por segurança, apenas queries SELECT são permitidas nesta interface.',
          count: 0,
          time: 0
        });
        setIsLoading(false);
        return;
      }

      // Extrai a tabela da query
      const tableMatch = queryToRun.match(/from\s+(\w+)/i);
      const tableName = tableMatch ? tableMatch[1] : null;

      if (!tableName) {
        setResult({
          data: null,
          error: 'Não foi possível identificar a tabela na query',
          count: 0,
          time: 0
        });
        setIsLoading(false);
        return;
      }

      // Executa query básica
      let supabaseQuery = supabase.from(tableName).select('*');

      // Tenta extrair LIMIT
      const limitMatch = queryToRun.match(/limit\s+(\d+)/i);
      if (limitMatch) {
        supabaseQuery = supabaseQuery.limit(parseInt(limitMatch[1]));
      }

      // Tenta extrair ORDER BY
      const orderMatch = queryToRun.match(/order\s+by\s+(\w+)(?:\s+(asc|desc))?/i);
      if (orderMatch) {
        const column = orderMatch[1];
        const ascending = orderMatch[2]?.toLowerCase() !== 'desc';
        supabaseQuery = supabaseQuery.order(column, { ascending });
      }

      // Tenta extrair WHERE simples (apenas igualdade)
      const whereMatch = queryToRun.match(/where\s+(\w+)\s*=\s*'?([^'\s]+)'?/i);
      if (whereMatch) {
        const column = whereMatch[1];
        let value: any = whereMatch[2];
        
        // Converte valores especiais
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(Number(value))) value = Number(value);
        
        supabaseQuery = supabaseQuery.eq(column, value);
      }

      // WHERE IN
      const whereInMatch = queryToRun.match(/where\s+(\w+)\s+in\s*\(([^)]+)\)/i);
      if (whereInMatch) {
        const column = whereInMatch[1];
        const values = whereInMatch[2].split(',').map(v => v.trim().replace(/'/g, ''));
        supabaseQuery = supabaseQuery.in(column, values);
      }

      const { data, error } = await supabaseQuery;

      const endTime = performance.now();

      if (error) {
        setResult({
          data: null,
          error: error.message,
          count: 0,
          time: Math.round(endTime - startTime)
        });
      } else {
        setResult({
          data,
          error: null,
          count: data?.length || 0,
          time: Math.round(endTime - startTime)
        });
      }
    } catch (error: any) {
      const endTime = performance.now();
      setResult({
        data: null,
        error: error.message || 'Erro desconhecido',
        count: 0,
        time: Math.round(endTime - startTime)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuery = (quickQuery: string) => {
    setQuery(quickQuery);
    executeQuery(quickQuery);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Terminal size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-white">
              Teste de Query SQL
            </h1>
            <p className="text-gray-400 text-sm">
              Execute queries no Supabase para testes
            </p>
          </div>
        </div>
      </div>

      {/* Queries Rápidas */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Code size={20} className="text-neon-purple" />
          <h2 className="font-display font-bold text-lg text-white">Queries Rápidas</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickQueries.map((q, index) => {
            const Icon = q.icon;
            return (
              <button
                key={index}
                onClick={() => handleQuickQuery(q.query)}
                disabled={isLoading}
                className="px-3 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 hover:border-neon-purple/50 rounded-lg text-sm text-gray-300 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Icon size={14} />
                {q.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor de Query */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Terminal size={20} className="text-neon-green" />
          <h2 className="font-display font-bold text-lg text-white">Query SQL</h2>
        </div>
        
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-40 bg-dark-900 border border-dark-600 rounded-lg p-4 font-mono text-sm text-gray-200 focus:outline-none focus:border-neon-purple/50 resize-y"
          placeholder="SELECT * FROM user_profiles LIMIT 10"
          spellCheck={false}
        />

        <div className="flex justify-end mt-4">
          <button
            onClick={() => executeQuery()}
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple hover:from-neon-pink/80 hover:to-neon-purple/80 text-white font-semibold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <Play size={18} />
                Executar Query
              </>
            )}
          </button>
        </div>
      </div>

      {/* Resultado */}
      {result && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {result.error ? (
                <XCircle size={20} className="text-red-400" />
              ) : (
                <CheckCircle size={20} className="text-neon-green" />
              )}
              <h2 className="font-display font-bold text-lg text-white">Resultado</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock size={14} />
              <span>{result.time}ms</span>
            </div>
          </div>

          {result.error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 font-mono text-sm">{result.error}</p>
            </div>
          ) : (
            <div className="bg-dark-900 border border-dark-600 rounded-lg p-4 overflow-auto max-h-[500px]">
              <p className="text-sm text-gray-400 mb-3">
                {result.count} {result.count === 1 ? 'registro encontrado' : 'registros encontrados'}
              </p>
              <pre className="font-mono text-sm text-gray-200 whitespace-pre-wrap">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Aviso de Segurança */}
      <div className="card bg-yellow-500/5 border-yellow-500/20">
        <div className="flex items-start gap-3">
          <Shield size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-400 mb-1">Aviso de Segurança</h3>
            <p className="text-sm text-gray-400">
              Por segurança, apenas queries <code className="bg-dark-700 px-1.5 py-0.5 rounded text-yellow-300">SELECT</code> são 
              permitidas nesta interface. Para operações de escrita (INSERT, UPDATE, DELETE), 
              use o Supabase Dashboard diretamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


