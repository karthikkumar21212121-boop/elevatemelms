const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jlfbmawoyiwzvzklngxr.supabase.co';
// Service role key — never expose this in frontend code
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
    if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

    let body;
    try { body = JSON.parse(event.body); }
    catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

    const { action, email, password, full_name, user_id, calling_user_token } = body;

    // Verify the calling user is an admin
    const anonClient = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZmJtYXdveWl3enZ6a2xuZ3hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NDI0OTMsImV4cCI6MjA4OTUxODQ5M30.JuMbxTyAhujTB4RqPiKbn5d4pxqK67EO_CTBj1xwt9o');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(calling_user_token);

    const ADMIN_EMAILS = ['support@elevateme.pro', 'divina.r@elevateme.pro'];
    if (authError || !user || !ADMIN_EMAILS.includes(user.email)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // Use service role client for admin operations
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        if (action === 'create') {
            const { data, error } = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: full_name || '' }
            });
            if (error) return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) };

            // Insert profile row
            await admin.from('profiles').upsert({
                id: data.user.id,
                email,
                full_name: full_name || ''
            }, { onConflict: 'id' });

            return { statusCode: 200, headers, body: JSON.stringify({ success: true, user: data.user }) };
        }

        if (action === 'delete') {
            const { error } = await admin.auth.admin.deleteUser(user_id);
            if (error) return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) };
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        if (action === 'reset_password') {
            const { error } = await admin.auth.admin.updateUserById(user_id, { password });
            if (error) return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) };
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        if (action === 'list') {
            const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
            if (error) return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) };
            return { statusCode: 200, headers, body: JSON.stringify({ users: data.users }) };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };

    } catch (err) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
};
