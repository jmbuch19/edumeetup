# EduMeetup MVP - Deployment Guide

## 1. Prepare for Deployment

### A. Environment Variables
Ensure you have the following environment variables ready for production (Vercel):
- `DATABASE_URL`: Your production database URL (e.g., from Neon, Supabase, or Railway). **SQLite will NOT work on Vercel** as it is ephemeral. You must provision a PostgreSQL or MySQL database.
- `NEXT_PUBLIC_APP_URL`: Your Vercel deployment URL (e.g., `https://edumeetup-mvp.vercel.app`).

### B. Database Migration (Neon.tech)
We are switching to PostgreSQL for production (Neon).
1.  **Update Local Config:**
    *   I have updated `prisma/schema.prisma` to use `postgresql`.
    *   **ACTION REQUIRED:** Open your `.env` file and replace the `DATABASE_URL` with your **Neon connection string**.
        ```env
        DATABASE_URL="postgres://user:password@ep-cool-site.us-east-2.aws.neon.tech/neondb?sslmode=require"
        ```
2.  **Push Schema to Neon:**
    *   Run this terminal command to setup the tables in your Neon Cloud DB:
        ```bash
        npx prisma db push
        ```
3.  **Seed Data (Optional):**
    *   To get the initial universities and admin, run:
        ```bash
        curl http://localhost:3000/api/seed
        ```
        (Make sure `npm run dev` is running)

## 2. Push to GitHub

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial MVP release"
   ```

2. **Create a Repository on GitHub:**
   - Go to GitHub -> New Repository
   - Name it `edumeetup-mvp`

3. **Link and Push:**
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/edumeetup-mvp.git
   git push -u origin main
   ```

## 3. Deploy to Vercel

1. **Import Project:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click **"Add New..."** -> **"Project"**
   - Import `edumeetup-mvp` from the list.

2. **Configure Project:**
   - **Framework Preset:** Next.js (should be auto-detected)
   - **Root Directory:** `./`
   - **Environment Variables:**
     - Add `DATABASE_URL` (Connection string to your production DB)
     - Add `SESSION_SECRET` (e.g., a random string like `complex-password-here`)
     - Add `GMAIL_USER` (Your Gmail address for notifications)
     - Add `GMAIL_APP_PASSWORD` (The App Password you generated)
     - (Optional) `INFO_EMAIL` (Receiver for contact form, defaults to info@edumeetup.com)
     - (Optional) `SUPPORT_EMAIL` (Receiver for support tickets, defaults to support@edumeetup.com)
   
3. **Deploy:**
   - Click **"Deploy"**.
   - Vercel will build and start your app.

## 4. Post-Deployment

1. **Seed Database (Optional):**
   - You may need to run your seed script or manually create an Admin account via Prisma Studio (if you can connect to remote DB) or via a temporary API route.

2. **Verify functionality:**
   - Check Sign Up, Login, and Dashboard.
