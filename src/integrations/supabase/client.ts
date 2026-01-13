// Legacy Supabase client stub - app now uses Express backend
// This stub prevents crashes from legacy code that still imports supabase

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ data: null, error: new Error('Use Express API for auth') }),
    signUp: async () => ({ data: null, error: new Error('Use Express API for auth') }),
    signOut: async () => ({ error: null }),
  },
  from: (table: string) => ({
    select: () => ({ data: null, error: new Error('Use Express API') }),
    insert: () => ({ data: null, error: new Error('Use Express API') }),
    update: () => ({ data: null, error: new Error('Use Express API') }),
    delete: () => ({ data: null, error: new Error('Use Express API') }),
  }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: new Error('Use Express API') }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
  functions: {
    invoke: async () => ({ data: null, error: new Error('Use Express API') }),
  },
};
