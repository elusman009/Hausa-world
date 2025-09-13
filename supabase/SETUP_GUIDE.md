# Hausaworld Supabase Setup Guide

Follow this step-by-step guide to set up your complete Supabase backend for Hausaworld.

## 🚀 Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project name: `hausaworld`
5. Enter a strong database password
6. Select a region close to your users
7. Click "Create new project"

## 📋 Step 2: Configure Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the entire content of `supabase/complete-schema.sql`
3. Click **Run** to create all tables, functions, and policies
4. Copy and paste the entire content of `supabase/storage-setup.sql`
5. Click **Run** to create storage buckets and policies

## 🔐 Step 3: Set Up Authentication

1. Go to **Authentication** → **Settings**
2. Under **Site URL**, add your domain:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`
3. Under **Redirect URLs**, add:
   - `http://localhost:3000/auth/callback`
   - `https://yourdomain.com/auth/callback` (for production)

### Enable Google OAuth (Optional)
1. Go to **Authentication** → **Providers**
2. Enable **Google**
3. Add your Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com)

## 🗂️ Step 4: Configure Storage

1. Go to **Storage** and verify these buckets were created:
   - `movie-posters` (public)
   - `movies` (private) 
   - `payment-proofs` (private)
   - `user-avatars` (public)

2. If buckets weren't created, create them manually:
   - Click **New bucket**
   - Enter name and configure privacy settings as noted above

## 🔑 Step 5: Get Your Environment Variables

1. Go to **Settings** → **API**
2. Copy these values to your `.env.local` file:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY`

## 👤 Step 6: Make Yourself Admin

1. Sign up for an account in your application
2. Go to **Table Editor** → **profiles** table
3. Find your profile record and edit it:
   - Set `role` field to `'admin'`
4. Save the changes

## 💳 Step 7: Configure Flutterwave

1. Sign up at [Flutterwave](https://flutterwave.com)
2. Go to **Settings** → **API Keys**
3. Copy your keys to `.env.local`:
   - **Secret Key** → `FLW_SECRET_KEY`
   - **Public Key** → `FLW_PUBLIC_KEY`
4. Set up webhook:
   - Go to **Settings** → **Webhooks**
   - Add webhook URL: `https://yourdomain.com/api/flutterwave/webhook`
   - Generate webhook secret → `FLW_WEBHOOK_SECRET`

## 🔧 Step 8: Environment Configuration

1. Copy `.env.local.example` to `.env.local`
2. Fill in all the values you collected above
3. Update `NEXT_PUBLIC_BASE_URL` to your actual domain
4. Add your email to `ADMIN_EMAILS`

## ✅ Step 9: Test Your Setup

1. Start your development server: `npm run dev`
2. Open your browser to `http://localhost:3000`
3. Test the following:
   - Sign up for an account
   - Browse movies (should load from database)
   - Try purchasing a movie (test payment flow)
   - Upload a movie poster (admin only)

## 🗃️ Step 10: Add Sample Data

If you want sample movies to test with:

1. Go to **SQL Editor** in Supabase
2. Run this query to add sample movies:

```sql
INSERT INTO movies (title, description, genre, year, price_kobo, is_trending) VALUES
('Sample Movie 1', 'A great action movie', 'Action', 2023, 150000, true),
('Sample Movie 2', 'A romantic comedy', 'Comedy', 2023, 120000, false),
('Sample Movie 3', 'An animated adventure', 'Animation', 2023, 180000, true);
```

## 🔄 Step 11: Update Schema Later (If Needed)

When you need to update your database schema:

1. Make changes to `complete-schema.sql`
2. Run the updated SQL in Supabase SQL Editor
3. The system will automatically handle migrations

## 🚨 Common Issues & Solutions

### Issue: RLS Policies Not Working
**Solution**: Make sure you ran both SQL files and that your user is properly authenticated.

### Issue: Storage Upload Fails
**Solution**: Check bucket policies and make sure the bucket exists with correct privacy settings.

### Issue: Payment Webhook Not Working
**Solution**: Verify your webhook URL is correct and accessible from the internet.

### Issue: Admin Features Not Working
**Solution**: Make sure your profile has `role = 'admin'` in the profiles table.

## 📞 Need Help?

If you encounter issues:
1. Check the Supabase logs in **Logs** → **Database**
2. Verify your environment variables are correct
3. Ensure all SQL scripts ran without errors
4. Check that your Flutterwave account is verified and active

## 🔐 Security Notes

- Never commit your `.env.local` file to version control
- Use strong passwords for your database
- Regularly rotate your API keys
- Enable MFA on your Supabase account
- Monitor your usage and set up billing alerts