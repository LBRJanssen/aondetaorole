-- ============================================
-- MIGRAÇÃO: Sistema de Carteiras da Plataforma
-- ============================================
-- Cria estrutura para carteiras separadas de Boost e Ingresso
-- Boost: 100% do valor vai para plataforma (sem comissão)
-- Ingresso: 10% de comissão vai para plataforma

-- ============================================
-- PASSO 1: Adicionar campo wallet_type na tabela wallets
-- ============================================

-- Adicionar coluna wallet_type
ALTER TABLE wallets 
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(20) DEFAULT 'user' 
CHECK (wallet_type IN ('user', 'platform_boost', 'platform_ticket'));

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_wallets_wallet_type ON wallets(wallet_type);

-- Atualizar carteiras existentes para 'user'
UPDATE wallets SET wallet_type = 'user' WHERE wallet_type IS NULL;

-- ============================================
-- PASSO 2: Modificar constraint UNIQUE de user_id
-- ============================================

-- Remover constraint UNIQUE de user_id se existir
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_user_id_key;

-- Criar constraint única composta (user_id, wallet_type)
-- Isso permite múltiplas carteiras por usuário com tipos diferentes
ALTER TABLE wallets 
ADD CONSTRAINT wallets_user_type_unique UNIQUE (user_id, wallet_type);

-- ============================================
-- PASSO 3: Criar tabela platform_transactions
-- ============================================

CREATE TABLE IF NOT EXISTS platform_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  wallet_type VARCHAR(20) NOT NULL CHECK (wallet_type IN ('boost', 'ticket')),
  
  -- Informações da transação original
  original_transaction_id UUID REFERENCES wallet_transactions(id),
  original_user_id UUID,
  original_event_id UUID,
  
  -- Valores
  commission_amount DECIMAL(10, 2) NOT NULL CHECK (commission_amount > 0),
  total_amount DECIMAL(10, 2) NOT NULL, -- Valor total da compra original
  commission_percentage DECIMAL(5, 2) DEFAULT 10.00, -- Porcentagem da comissão (só para tickets)
  
  -- Saldos
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  
  -- Descrição
  description TEXT NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'completed' 
    CHECK (status IN ('completed', 'pending', 'failed', 'cancelled')),
  
  -- Metadados
  metadata JSONB DEFAULT '{}', -- Informações extras (tipo de boost, categoria de ingresso, etc)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_platform_transactions_wallet_type 
  ON platform_transactions(wallet_type);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_created_at 
  ON platform_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_original_transaction_id 
  ON platform_transactions(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_original_user_id 
  ON platform_transactions(original_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_original_event_id 
  ON platform_transactions(original_event_id);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_platform_wallet_id 
  ON platform_transactions(platform_wallet_id);

-- Comentários nas colunas (documentação)
COMMENT ON TABLE platform_transactions IS 'Registra todas as transações das carteiras da plataforma (boost e ticket)';
COMMENT ON COLUMN platform_transactions.commission_amount IS 'Valor da comissão recebida pela plataforma';
COMMENT ON COLUMN platform_transactions.total_amount IS 'Valor total da compra original do usuário';
COMMENT ON COLUMN platform_transactions.commission_percentage IS 'Porcentagem da comissão (10% para tickets, 100% para boosts)';

-- ============================================
-- PASSO 4: Criar as duas carteiras da plataforma
-- ============================================

DO $$
DECLARE
  platform_user_id UUID := 'b306fbee-4183-40f9-b351-8e1ef05bb61c';
BEGIN
  -- Carteira de Boost (recebe 100% do valor)
  INSERT INTO wallets (user_id, wallet_type, balance, total_deposited, total_withdrawn)
  VALUES (platform_user_id, 'platform_boost', 0.00, 0.00, 0.00)
  ON CONFLICT (user_id, wallet_type) DO NOTHING;
  
  -- Carteira de Ingresso (recebe 10% de comissão)
  INSERT INTO wallets (user_id, wallet_type, balance, total_deposited, total_withdrawn)
  VALUES (platform_user_id, 'platform_ticket', 0.00, 0.00, 0.00)
  ON CONFLICT (user_id, wallet_type) DO NOTHING;
  
  RAISE NOTICE '✅ Carteiras da plataforma criadas!';
END $$;

-- ============================================
-- PASSO 5: Row Level Security (RLS) para platform_transactions
-- ============================================

ALTER TABLE platform_transactions ENABLE ROW LEVEL SECURITY;

-- Apenas usuários com cargo financeiro/admin podem ver transações da plataforma
DROP POLICY IF EXISTS "Finance team can view platform transactions" ON platform_transactions;

CREATE POLICY "Finance team can view platform transactions"
  ON platform_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type IN ('owner', 'admin', 'financeiro')
    )
  );

-- Apenas usuários com cargo financeiro/admin podem inserir transações
DROP POLICY IF EXISTS "Finance team can insert platform transactions" ON platform_transactions;

CREATE POLICY "Finance team can insert platform transactions"
  ON platform_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type IN ('owner', 'admin', 'financeiro')
    )
  );

-- ============================================
-- PASSO 6: Proteção das Carteiras da Plataforma
-- ============================================

-- Atualizar política de wallets para proteger carteiras da plataforma
-- Nota: Isso depende de políticas RLS existentes, pode precisar ser ajustado
-- Por enquanto, apenas documentar que carteiras da plataforma não devem ser modificadas diretamente

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar se as carteiras foram criadas
SELECT 
  wallet_type,
  balance,
  total_deposited,
  total_withdrawn,
  created_at
FROM wallets
WHERE wallet_type IN ('platform_boost', 'platform_ticket')
ORDER BY wallet_type;

