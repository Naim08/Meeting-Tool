import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Database = Record<string, any>; // Replace with typed schema when available.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_DB2_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_DB2_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_DB2_URL and NEXT_PUBLIC_SUPABASE_DB2_ANON_KEY.");
}

export const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseAnonKey);







