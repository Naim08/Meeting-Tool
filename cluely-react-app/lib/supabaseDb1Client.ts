import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Database = Record<string, any>;

const db1Url = process.env.NEXT_PUBLIC_SUPABASE_DB1_URL;
const db1AnonKey = process.env.NEXT_PUBLIC_SUPABASE_DB1_ANON_KEY;

export const supabaseDb1 = db1Url && db1AnonKey ? createClient<Database>(db1Url, db1AnonKey) : null;







