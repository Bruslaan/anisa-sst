// supabase-client.tsx
import {createClient} from '@supabase/supabase-js';


const supabase = () => {
    if (!process.env.SUPABASE_URL) {
        throw new Error('Missing env.SUPABASE_URL');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
    }

    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

export default supabase;
