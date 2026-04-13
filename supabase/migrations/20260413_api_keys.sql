-- API Keys Table
-- Stores API keys for headless API authentication

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  praxis_id UUID NOT NULL REFERENCES praxis(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- First 12 chars for lookup
  key_hash TEXT NOT NULL, -- SHA-256 hash for verification
  environment TEXT NOT NULL DEFAULT 'live' CHECK (environment IN ('live', 'test')),
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read', 'write'],
  rate_limit INTEGER NOT NULL DEFAULT 100, -- Requests per minute
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  
  CONSTRAINT valid_key_prefix CHECK (char_length(key_prefix) = 12)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_praxis ON api_keys(praxis_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- RLS Policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  USING (praxis_id = get_current_praxis_id());

CREATE POLICY "Users can create own API keys"
  ON api_keys FOR INSERT
  WITH CHECK (praxis_id = get_current_praxis_id());

CREATE POLICY "Users can delete own API keys"
  ON api_keys FOR DELETE
  USING (praxis_id = get_current_praxis_id());

-- Service role can access all
CREATE POLICY "Service role can access all API keys"
  ON api_keys FOR ALL
  USING (is_service_role());

-- Function to generate API key
CREATE OR REPLACE FUNCTION generate_api_key(
  p_praxis_id UUID,
  p_name TEXT,
  p_environment TEXT DEFAULT 'live',
  p_scopes TEXT[] DEFAULT ARRAY['read', 'write']
)
RETURNS TABLE(key TEXT, id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
  v_key TEXT;
  v_prefix TEXT;
  v_hash TEXT;
  v_id UUID;
BEGIN
  -- Generate random key
  v_key := 'vet_' || p_environment || '_' || encode(gen_random_bytes(24), 'base64');
  v_key := replace(v_key, '+', 'a');
  v_key := replace(v_key, '/', 'b');
  v_key := replace(v_key, '=', '');
  
  v_prefix := substring(v_key, 1, 12);
  v_hash := encode(digest(v_key, 'sha256'), 'hex');
  
  INSERT INTO api_keys (praxis_id, name, key_prefix, key_hash, environment, scopes)
  VALUES (p_praxis_id, p_name, v_prefix, v_hash, p_environment, p_scopes)
  RETURNING api_keys.id INTO v_id;
  
  RETURN QUERY SELECT v_key, v_id;
END;
$$;

-- Function to revoke API key
CREATE OR REPLACE FUNCTION revoke_api_key(p_key_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE api_keys
  SET revoked_at = NOW()
  WHERE id = p_key_id AND revoked_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Insert a test API key for development
-- This should be removed in production
INSERT INTO api_keys (
  praxis_id,
  name,
  key_prefix,
  key_hash,
  environment,
  scopes,
  rate_limit
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test API Key',
  'vet_test_12',
  encode(digest('vet_test_1234567890abcdefghijklmno', 'sha256'), 'hex'),
  'test',
  ARRAY['read', 'write'],
  100
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE api_keys IS 'API keys for headless API authentication';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 12 characters of the key for fast lookup';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the full key for verification';
COMMENT ON COLUMN api_keys.environment IS 'live or test environment';
COMMENT ON COLUMN api_keys.scopes IS 'Array of permission scopes (read, write)';
COMMENT ON COLUMN api_keys.rate_limit IS 'Requests per minute allowed';