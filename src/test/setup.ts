import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
        data: [],
        error: null,
      })),
      insert: vi.fn(() => ({
        data: { id: 'test-id' },
        error: null,
      })),
      update: vi.fn(() => ({
        data: { id: 'test-id' },
        error: null,
      })),
    })),
    auth: {
      getSession: vi.fn(() => ({
        data: { session: null },
        error: null,
      })),
    },
  },
}));

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    userInfo: { praxisId: '00000000-0000-0000-0000-000000000001', id: 'test-vet-id' },
    loading: false,
  })),
}));