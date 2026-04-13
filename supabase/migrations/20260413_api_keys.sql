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

-- Anon cannot access
CREATE POLICY "Anon cannot access api_keys"
  ON api_keys FOR ALL
  USING (false);

-- Service role can access all
CREATE POLICY "Service role full access"
  ON api_keys FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Insert a test API key for development
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