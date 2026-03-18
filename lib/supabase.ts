import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // iOS Safari (and some other mobile browsers) can time out waiting to
    // acquire a Navigator LockManager lock on the auth token, producing:
    //   "Acquiring an exclusive Navigator LockManager lock timed out waiting 10000ms"
    // Providing a no-op lock bypasses the Web Locks API entirely while
    // still allowing normal single-tab session access.
    lock: (_name, _acquireTimeout, fn) => fn(),
  },
});
