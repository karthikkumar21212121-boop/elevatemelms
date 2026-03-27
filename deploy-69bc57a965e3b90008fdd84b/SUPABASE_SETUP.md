# ElevateMe — Supabase Setup Guide
## Get your login system live in 10 minutes

---

## Step 1 — Create a Supabase project (2 min)

1. Go to https://app.supabase.com and sign up (free)
2. Click **New Project**
3. Give it a name: `elevateme-lms`
4. Set a strong database password (save it somewhere)
5. Choose region closest to your students (US East recommended)
6. Click **Create new project** — wait ~2 minutes

---

## Step 2 — Create the database tables (3 min)

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Paste the entire SQL block below and click **Run**

```sql
-- PROFILES TABLE
-- Stores one row per user with their progress percentages per week
CREATE TABLE IF NOT EXISTS profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    full_name       TEXT,
    last_login      TIMESTAMPTZ,
    week1_progress  INTEGER DEFAULT 0,
    week2_progress  INTEGER DEFAULT 0,
    week3_progress  INTEGER DEFAULT 0,
    week4_progress  INTEGER DEFAULT 0,
    week5_progress  INTEGER DEFAULT 0,
    week6_progress  INTEGER DEFAULT 0,
    week7_progress  INTEGER DEFAULT 0,
    week8_progress  INTEGER DEFAULT 0,
    week9_progress  INTEGER DEFAULT 0,
    week10_progress INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- PROGRESS TABLE
-- Stores one row per module completed per user
CREATE TABLE IF NOT EXISTS progress (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id    TEXT NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, module_id)
);

-- ROW LEVEL SECURITY
-- Students can only see/edit their own data
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress  ENABLE ROW LEVEL SECURITY;

-- POLICIES for profiles
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- POLICIES for progress
CREATE POLICY "Users can read own progress"
    ON progress FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
    ON progress FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
    ON progress FOR DELETE USING (auth.uid() = user_id);

-- ADMIN POLICY — admins can read ALL profiles and progress
-- Replace the emails below with your actual admin emails
CREATE POLICY "Admins can read all profiles"
    ON profiles FOR SELECT
    USING (
        auth.jwt() ->> 'email' IN (
            'nitti.v@elevateme.pro',
            'divina.r@elevateme.pro'
        )
    );

CREATE POLICY "Admins can read all progress"
    ON progress FOR SELECT
    USING (
        auth.jwt() ->> 'email' IN (
            'nitti.v@elevateme.pro',
            'divina.r@elevateme.pro'
        )
    );

-- INDEXES for performance with 50+ students
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_module_id ON progress(module_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
```

4. You should see **Success. No rows returned.** — this means it worked.

---

## Step 3 — Get your API keys (1 min)

1. In Supabase, click **Settings** (gear icon) in the left sidebar
2. Click **API**
3. You'll see two values you need:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public key** — a long string starting with `eyJ...`

---

## Step 4 — Add your keys to all files (3 min)

Open each of these files and replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY`:

### Files to update:
- `shared/app.js` (line 5 and 6)
- `login.html` (line in the script block)
- `admin.html` (line in the script block)
- `index.html` (in the script block at the bottom)

### Example — what to replace:
```javascript
// BEFORE
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

// AFTER
const SUPABASE_URL = 'https://abcdefgh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

## Step 5 — Update index.html to require login (1 min)

Add this to the `<head>` of `index.html`:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

And add this at the top of the `<script>` block in `index.html`:
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Redirect to login if not signed in
(async () => {
    const { data: { session } } = await _sb.auth.getSession();
    if (!session) window.location.href = './login.html';
})();
```

---

## Step 6 — Create your first student account (1 min)

### Option A — Using Supabase dashboard (easiest):
1. In Supabase → **Authentication** → **Users**
2. Click **Invite user**
3. Enter the student's email
4. They receive an email to set their password

### Option B — Using the Admin Dashboard:
1. Go to `yourdomain.com/admin.html`
2. Sign in with your admin email
3. Click **Add Student**
4. Fill in name, email, and temporary password
5. The student logs in at `yourdomain.com/login.html` and changes their password

---

## Step 7 — Create YOUR admin account

1. In Supabase → **Authentication** → **Users** → **Add user**
2. Enter your email (nitti.v@elevateme.pro or divina.r@elevateme.pro)
3. Set a strong password
4. You can now sign in at `yourdomain.com/admin.html`

---

## Step 8 — Push to GitHub + deploy (1 min)

Commit and push all changed files to GitHub. Netlify auto-deploys in 30 seconds.

---

## URL Structure After Setup

| URL | Who |
|-----|-----|
| `yourdomain.com` | Dashboard (requires login) |
| `yourdomain.com/login.html` | Student login page |
| `yourdomain.com/admin.html` | Admin dashboard |
| `yourdomain.com/week1/` | Week 1 (requires login) |

---

## Troubleshooting

**"Invalid API key" error**
→ Double-check you copied the `anon public` key, not the `service_role` key

**Students can't see their progress after logging in**
→ Check the RLS policies ran correctly in the SQL Editor

**Admin dashboard shows "Access denied"**
→ Make sure your email matches exactly what's in the SQL and in `admin.html` ADMIN_EMAILS array

**Students get redirected back to login after signing in**
→ Go to Supabase → Authentication → URL Configuration → Add your Netlify domain to "Redirect URLs": `https://yourdomain.com/**`

---

## What Each File Does

| File | Purpose |
|------|---------|
| `login.html` | Student login + forgot password |
| `admin.html` | Tutor dashboard — all student progress |
| `shared/app.js` | Saves progress to Supabase on every module completion |
| Supabase `profiles` table | One row per student, week progress % columns |
| Supabase `progress` table | One row per module completed per student |
