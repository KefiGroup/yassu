# Yassu Deployment Guide - Railway + GoDaddy

## Prerequisites

- GitHub account with access to https://github.com/KefiGroup/yassu
- Railway account (sign up at https://railway.app)
- GoDaddy account with yassu.ai domain
- OpenAI API key (for business plan generation)

---

## Step 1: Push Latest Changes to GitHub

All deployment files have been prepared. Push the changes:

```bash
cd /home/ubuntu/yassu
git add .
git commit -m "Prepare for Railway deployment with yassu.ai domain"
git push origin main
```

---

## Step 2: Set Up Railway Project

### 2.1 Create New Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `KefiGroup/yassu` repository
5. Railway will automatically detect it's a Node.js app

### 2.2 Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will create a database and provide `DATABASE_URL`
4. The `DATABASE_URL` will be automatically available to your app

### 2.3 Configure Environment Variables

Click on your service → "Variables" tab → Add these variables:

```
NODE_ENV=production
SESSION_SECRET=<generate-a-random-32-character-string>
OPENAI_API_KEY=<your-openai-api-key>
FRONTEND_URL=https://yassu.ai
```

**To generate SESSION_SECRET:**
```bash
openssl rand -base64 32
```

**Optional OAuth Variables** (if you want Google/Apple login):
```
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=https://yassu.ai/api/auth/google/callback

APPLE_CLIENT_ID=<your-apple-client-id>
APPLE_TEAM_ID=<your-apple-team-id>
APPLE_KEY_ID=<your-apple-key-id>
APPLE_PRIVATE_KEY=<your-apple-private-key>
APPLE_CALLBACK_URL=https://yassu.ai/api/auth/apple/callback
```

---

## Step 3: Deploy Application

1. Railway will automatically deploy after you connect the repo
2. Wait for the build to complete (5-10 minutes)
3. Check the deployment logs for any errors
4. Once deployed, Railway will provide a temporary URL like: `yassu-production.up.railway.app`

### 3.1 Run Database Migrations

After first deployment, you need to initialize the database:

1. Go to Railway project → Your service
2. Click "Settings" → "Deploy Triggers"
3. Or use Railway CLI to run migrations:

```bash
# Install Railway CLI
pnpm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run pnpm run db:push
```

---

## Step 4: Connect yassu.ai Domain

### 4.1 Add Custom Domain in Railway

1. In Railway project, click on your service
2. Go to "Settings" tab
3. Scroll to "Domains" section
4. Click "Custom Domain"
5. Enter: `yassu.ai`
6. Railway will provide DNS records to add

### 4.2 Configure DNS in GoDaddy

1. Log in to GoDaddy: https://dcc.godaddy.com
2. Go to "My Products" → "Domains" → Click on `yassu.ai`
3. Click "DNS" → "Manage DNS"

**Add these DNS records:**

#### Option A: Using CNAME (Recommended)
```
Type: CNAME
Name: @
Value: <railway-provided-domain>.railway.app
TTL: 600 seconds
```

#### Option B: Using A Record
```
Type: A
Name: @
Value: <railway-provided-ip-address>
TTL: 600 seconds
```

**Also add www subdomain:**
```
Type: CNAME
Name: www
Value: yassu.ai
TTL: 600 seconds
```

### 4.3 Wait for DNS Propagation

- DNS changes can take 1-48 hours to propagate
- Usually takes 15-30 minutes
- Check status: https://www.whatsmydns.net/#CNAME/yassu.ai

### 4.4 SSL Certificate

Railway automatically provisions SSL certificates via Let's Encrypt once DNS is configured. This usually takes 5-10 minutes after DNS propagation.

---

## Step 5: Verify Deployment

### 5.1 Test the Application

1. Visit https://yassu.ai
2. Test key features:
   - Landing page loads
   - Sign up / Login works
   - Create idea works
   - Ideas marketplace loads
   - My Projects dashboard works
   - Express Interest functionality works

### 5.2 Check Database Connection

1. Try creating a new account
2. Post a new idea
3. Generate business plan
4. Verify data persists after refresh

### 5.3 Monitor Logs

In Railway:
1. Go to your service
2. Click "Deployments" tab
3. View real-time logs
4. Check for any errors

---

## Step 6: Post-Deployment Configuration

### 6.1 Create Admin Account

1. Sign up with paulinet77@gmail.com
2. Manually set as admin in database (if needed):

```sql
-- Connect to Railway PostgreSQL
UPDATE users SET role = 'admin' WHERE email = 'paulinet77@gmail.com';
```

### 6.2 Update OAuth Callback URLs

If using OAuth, update callback URLs in:
- Google Cloud Console: https://console.cloud.google.com
- Apple Developer: https://developer.apple.com

Change callbacks from localhost to:
- `https://yassu.ai/api/auth/google/callback`
- `https://yassu.ai/api/auth/apple/callback`

### 6.3 Test Referral Tracking

1. Log in as admin
2. Navigate to Admin → Referrals
3. Test "Build MVP with Manus AI" button
4. Verify referral tracking works

---

## Troubleshooting

### Build Fails

**Check build logs in Railway:**
- Missing dependencies? Run `pnpm install` locally first
- TypeScript errors? Fix them before deploying
- Environment variables missing? Add them in Railway

### Database Connection Fails

**Verify DATABASE_URL:**
```bash
# In Railway, check Variables tab
# Should look like:
# postgresql://postgres:password@host.railway.internal:5432/railway
```

### Domain Not Resolving

**Check DNS:**
```bash
# Check if DNS is propagated
nslookup yassu.ai

# Should return Railway's IP address
```

### SSL Certificate Not Working

**Wait for DNS propagation:**
- SSL cert is auto-provisioned after DNS resolves
- Can take 5-30 minutes
- Check Railway logs for SSL provisioning status

### App Crashes on Startup

**Check logs for:**
- Missing environment variables
- Database connection errors
- Port binding issues (Railway sets PORT automatically)

---

## Maintenance

### Update Application

```bash
# Make changes locally
git add .
git commit -m "Your changes"
git push origin main

# Railway auto-deploys on push to main branch
```

### Database Backups

Railway provides automatic daily backups for PostgreSQL. To create manual backup:

1. Go to Railway → Database service
2. Click "Backups" tab
3. Click "Create Backup"

### Monitor Performance

Railway provides:
- CPU usage
- Memory usage
- Network traffic
- Request logs

Access via: Railway Dashboard → Your Service → Metrics

---

## Cost Estimate

**Railway Pricing:**
- Hobby Plan: $5/month (includes $5 credit)
- Pro Plan: $20/month (includes $20 credit)
- Usage-based: ~$0.000463/GB-hour for memory

**Estimated Monthly Cost:**
- Small app (< 1000 users): $5-10/month
- Medium app (1000-10000 users): $20-50/month

**GoDaddy Domain:**
- yassu.ai: ~$15-30/year (already owned)

---

## Support

**Railway:**
- Discord: https://discord.gg/railway
- Docs: https://docs.railway.app

**Yassu Issues:**
- GitHub: https://github.com/KefiGroup/yassu/issues

---

## Summary Checklist

- [ ] Push code to GitHub
- [ ] Create Railway project
- [ ] Add PostgreSQL database
- [ ] Configure environment variables
- [ ] Deploy application
- [ ] Run database migrations
- [ ] Add custom domain in Railway
- [ ] Configure DNS in GoDaddy
- [ ] Wait for DNS propagation
- [ ] Verify SSL certificate
- [ ] Test application functionality
- [ ] Create admin account
- [ ] Update OAuth callbacks (if using)
- [ ] Monitor deployment logs

**Deployment complete!** 🚀

Your Yassu platform will be live at: **https://yassu.ai**
