import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://djodctopyiwiphypfiwh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-nwWNGk8bZXrwwNplPEOIA_6dALsE5m';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
