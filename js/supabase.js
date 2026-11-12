
import { createClient } from
  "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://hlwctlmrfubbqoohzird.supabase.co/rest/v1/";

const SUPABASE_KEY = "sb_publishable_ZpxxlF6x9KOMHij-SvNcgA_x3ZOn8UV";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
