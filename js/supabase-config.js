const SUPABASE_URL = "https://anoaatioqbxuuxyfiovi.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_dI5wox5Lq-DB6G7t-g6VvQ_06I4q9EK";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
);
