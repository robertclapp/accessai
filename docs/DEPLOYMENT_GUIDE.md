# AccessAI Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying AccessAI across multiple platforms. The recommended approach for a solo developer on a shoestring budget is to use the built-in Manus hosting, which provides the simplest deployment path with automatic SSL, database management, and CI/CD integration.

---

## Deployment Options Comparison

| Platform | Cost | Complexity | Best For |
|----------|------|------------|----------|
| **Manus Hosting** | Included | Very Low | Recommended for most users |
| Vercel + Supabase | $0-25/mo | Low | Developers familiar with Vercel |
| Railway | $5-20/mo | Low | Full-stack apps with databases |
| Render | $0-25/mo | Low | Background jobs and cron tasks |
| AWS (ECS/Lambda) | $10-50/mo | High | Enterprise scale requirements |
| DigitalOcean | $5-24/mo | Medium | VPS with full control |

---

## Option 1: Manus Hosting (Recommended)

Manus hosting is the simplest deployment option, as the platform handles infrastructure, SSL certificates, database management, and automatic deployments.

### Step 1: Create a Checkpoint

Before publishing, you must create a checkpoint of your current project state. This has already been done during development, but you can create additional checkpoints as needed.

### Step 2: Publish via Management UI

Navigate to the Manus Management UI and click the "Publish" button in the header. The platform will automatically build and deploy your application with the following features:

- Automatic SSL certificate provisioning
- CDN distribution for static assets
- Database connection management
- Environment variable injection

### Step 3: Configure Custom Domain

In the Management UI, navigate to Settings > Domains. You can modify the auto-generated domain prefix (xxx.manus.space), purchase a new domain directly within Manus, or bind an existing custom domain.

### Step 4: Claim Stripe Sandbox

Before going live with payments, claim your Stripe test sandbox at the URL provided during setup. This must be done before the expiration date to activate the test environment.

---

## Option 2: Vercel + Supabase

This option is suitable for developers who prefer the Vercel ecosystem and want more control over their deployment.

### Prerequisites

- Vercel account (free tier available)
- Supabase account (free tier available)
- GitHub account for repository hosting

### Step 1: Prepare the Repository

The AccessAI codebase is already configured for Vercel deployment. Push the code to your GitHub repository:

```bash
cd /home/ubuntu/accessai
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/accessai.git
git push -u origin main
```

### Step 2: Create Supabase Project

Log into Supabase and create a new project. Note the following credentials from your project settings:

- Project URL (SUPABASE_URL)
- Anon Key (SUPABASE_ANON_KEY)
- Service Role Key (SUPABASE_SERVICE_ROLE_KEY)
- Database URL (DATABASE_URL)

### Step 3: Configure Database

Run the database migrations using the Supabase SQL editor or connect via psql:

```sql
-- Copy the contents of drizzle/migrations/*.sql
-- and execute in the Supabase SQL editor
```

Alternatively, configure Drizzle to connect to Supabase:

```bash
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" pnpm db:push
```

### Step 4: Deploy to Vercel

Import your GitHub repository in the Vercel dashboard. Configure the following settings:

**Build Settings:**
- Framework Preset: Other
- Build Command: `pnpm build`
- Output Directory: `dist`
- Install Command: `pnpm install`

**Environment Variables:**
Add all required environment variables from the `.env.example` file, including:

| Variable | Description |
|----------|-------------|
| DATABASE_URL | Supabase PostgreSQL connection string |
| JWT_SECRET | Random 32+ character string for session signing |
| VITE_APP_ID | Your Manus OAuth application ID |
| OAUTH_SERVER_URL | Manus OAuth backend URL |
| VITE_OAUTH_PORTAL_URL | Manus login portal URL |
| STRIPE_SECRET_KEY | Stripe secret key (sk_test_...) |
| STRIPE_WEBHOOK_SECRET | Stripe webhook signing secret |
| VITE_STRIPE_PUBLISHABLE_KEY | Stripe publishable key (pk_test_...) |

### Step 5: Configure Stripe Webhooks

In your Stripe dashboard, add a webhook endpoint pointing to:
```
https://your-vercel-domain.vercel.app/api/stripe/webhook
```

Select the following events:
- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_failed

### Step 6: Verify Deployment

After deployment, verify all features are working:

1. Visit the landing page and confirm it loads correctly
2. Test the OAuth login flow
3. Create a test post with voice input
4. Check the accessibility checker functionality
5. Test a Stripe checkout flow in test mode

---

## Option 3: Railway

Railway provides a simple deployment experience with built-in database support.

### Step 1: Create Railway Project

Log into Railway and create a new project from your GitHub repository.

### Step 2: Add MySQL Database

In your Railway project, add a MySQL database service. Railway will automatically provide the DATABASE_URL environment variable.

### Step 3: Configure Environment

Add all required environment variables in the Railway dashboard, similar to the Vercel setup above.

### Step 4: Deploy

Railway will automatically build and deploy your application when you push to the main branch.

---

## Option 4: Render

Render offers free tier hosting with automatic SSL and easy scaling.

### Step 1: Create Web Service

In Render, create a new Web Service connected to your GitHub repository.

### Step 2: Configure Build Settings

- Build Command: `pnpm install && pnpm build`
- Start Command: `pnpm start`
- Environment: Node

### Step 3: Add Database

Create a new PostgreSQL database in Render and connect it to your web service.

### Step 4: Configure Environment Variables

Add all required environment variables in the Render dashboard.

---

## Environment Variables Reference

The following environment variables are required for AccessAI to function properly:

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | Database connection string |
| JWT_SECRET | Yes | Secret for signing JWT tokens |
| VITE_APP_ID | Yes | Manus OAuth application ID |
| OAUTH_SERVER_URL | Yes | Manus OAuth backend URL |
| VITE_OAUTH_PORTAL_URL | Yes | Manus login portal URL |
| OWNER_OPEN_ID | Yes | Owner's Manus OpenID |
| OWNER_NAME | Yes | Owner's display name |
| BUILT_IN_FORGE_API_URL | Yes | Manus built-in API URL |
| BUILT_IN_FORGE_API_KEY | Yes | Manus API key (server-side) |
| VITE_FRONTEND_FORGE_API_KEY | Yes | Manus API key (frontend) |
| VITE_FRONTEND_FORGE_API_URL | Yes | Manus API URL (frontend) |
| STRIPE_SECRET_KEY | For payments | Stripe secret key |
| STRIPE_WEBHOOK_SECRET | For payments | Stripe webhook signing secret |
| VITE_STRIPE_PUBLISHABLE_KEY | For payments | Stripe publishable key |

---

## Post-Deployment Checklist

After deploying AccessAI, complete the following checklist to ensure everything is working correctly:

### Functionality Testing

- [ ] Landing page loads correctly with all sections
- [ ] OAuth login flow works (sign in with Manus)
- [ ] Dashboard displays after authentication
- [ ] Voice recording and transcription works
- [ ] AI content generation produces results
- [ ] Accessibility checker provides scores and suggestions
- [ ] Knowledge base CRUD operations work
- [ ] Content calendar displays and allows scheduling
- [ ] Analytics dashboard shows data
- [ ] Team management features work
- [ ] Stripe checkout creates a session
- [ ] Stripe webhooks are received and processed

### Accessibility Testing

- [ ] All pages pass Lighthouse accessibility audit (score > 90)
- [ ] Keyboard navigation works throughout the app
- [ ] Screen reader announces all interactive elements
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA standards
- [ ] All images have alt text

### Security Testing

- [ ] HTTPS is enforced on all pages
- [ ] Authentication tokens are properly secured
- [ ] API endpoints require authentication where appropriate
- [ ] Stripe webhook signature verification is working
- [ ] No sensitive data is exposed in client-side code

### Performance Testing

- [ ] Initial page load < 3 seconds
- [ ] Time to interactive < 5 seconds
- [ ] API responses < 500ms (except AI generation)
- [ ] Images are optimized and lazy-loaded

---

## Monitoring and Maintenance

### Error Tracking

Consider integrating an error tracking service like Sentry for production monitoring:

```bash
pnpm add @sentry/node @sentry/react
```

### Analytics

The built-in analytics dashboard tracks post performance. For website analytics, consider integrating:

- Plausible Analytics (privacy-focused, $9/mo)
- Fathom Analytics (privacy-focused, $14/mo)
- Google Analytics (free, less privacy-focused)

### Database Backups

Ensure your database provider has automatic backups enabled. For Supabase, backups are included in the free tier. For self-hosted databases, set up a cron job to run daily backups.

### SSL Certificate Renewal

If using Manus hosting, Vercel, Railway, or Render, SSL certificates are automatically renewed. For self-hosted deployments, ensure Let's Encrypt certificates are set to auto-renew.

---

## Scaling Considerations

As AccessAI grows, consider the following scaling strategies:

### Database Scaling

- Enable connection pooling (PgBouncer for PostgreSQL)
- Add read replicas for heavy read workloads
- Implement caching with Redis for frequently accessed data

### Application Scaling

- Use horizontal scaling with multiple instances
- Implement a CDN for static assets
- Consider serverless functions for AI processing

### Cost Optimization

- Monitor API usage and optimize LLM calls
- Implement caching for repeated AI requests
- Use tiered storage for generated images

---

## Troubleshooting

### Common Issues

**OAuth Login Fails**
- Verify VITE_APP_ID and OAUTH_SERVER_URL are correct
- Check that the redirect URI is properly configured
- Ensure cookies are enabled in the browser

**Database Connection Errors**
- Verify DATABASE_URL is correct
- Check that the database server is accessible
- Ensure SSL is enabled if required by the provider

**Stripe Webhooks Not Received**
- Verify the webhook endpoint URL is correct
- Check that STRIPE_WEBHOOK_SECRET matches the Stripe dashboard
- Ensure the webhook events are selected in Stripe

**Voice Recording Not Working**
- Ensure HTTPS is enabled (required for microphone access)
- Check browser permissions for microphone
- Verify the Whisper API credentials are correct

---

## Support

For issues with AccessAI deployment, check the following resources:

- GitHub Issues: Report bugs and feature requests
- Documentation: Check the docs folder for additional guides
- Community: Join the Discord server for community support

For Manus platform-specific issues, visit https://help.manus.im
