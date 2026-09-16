require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL과 SUPABASE_ANON_KEY 환경 변수를 설정하세요 (.env 참고).');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
