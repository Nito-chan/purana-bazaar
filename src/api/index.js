import { createMockApi } from './mock/adapter.js';

// Phase 0 ships against an in-memory adapter. Phase 1 swaps this module for a
// Supabase-backed implementation while keeping the same public surface.
export const api = createMockApi();
