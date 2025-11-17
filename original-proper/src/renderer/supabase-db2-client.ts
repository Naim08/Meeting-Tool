import { createClient } from "@supabase/supabase-js";

// DB2 - Web/Auth + Calendar source of truth
// This is the main authentication database that holds calendar events
export const supabaseDb2 = createClient(
  "https://ggzxxdtmwvublestzawb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnenh4ZHRtd3Z1Ymxlc3R6YXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NzI5MTQsImV4cCI6MjA3NTE0ODkxNH0.vE4B1Va31lmqJpIa63lYCpQUNxagbEkMVxsw-TzAOyM"
);
