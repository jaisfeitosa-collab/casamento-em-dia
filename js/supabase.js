
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// URL principal do projeto Supabase
const supabaseUrl =
  "https://hlwctlmrfubbqoohzird.supabase.co";

// Chave pública do projeto Supabase
const supabaseKey =
  "COLE_AQUI_SUA_CHAVE_PUBLICA";

// Cliente de conexão com o Supabase
export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
