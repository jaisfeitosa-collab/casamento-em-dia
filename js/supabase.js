
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// URL principal do projeto Supabase
const supabaseUrl =
  "https://hlwctlmrfubbqoohzird.supabase.co";

// Chave pública do projeto Supabase
const supabaseKey =
  "sb_publishable_ZpxxlF6x9KOMHij-SvNcgA_x3ZOn8UV";

// Cliente de conexão com o Supabase
export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
