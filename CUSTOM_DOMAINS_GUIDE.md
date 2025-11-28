# Custom Domain Setup Guide

This guide explains how to use the custom domain feature to host your assessments on your own domains.

## Overview

The custom domain feature allows you to:
- Host assessments on your own branded domains (e.g., `quiz.yourdomain.com`)
- Use either subdomains or root domains
- Verify domain ownership via DNS
- Automatic routing from custom domains to your assessments
- Track analytics for custom domain visits

## Table of Contents
1. [How It Works](#how-it-works)
2. [Adding a Custom Domain](#adding-a-custom-domain)
3. [DNS Configuration](#dns-configuration)
4. [Domain Verification](#domain-verification)
5. [Activating Your Domain](#activating-your-domain)
6. [Troubleshooting](#troubleshooting)
7. [Technical Details](#technical-details)

## How It Works

1. **Add Domain**: You add your custom domain in the application
2. **Verify Ownership**: Prove you own the domain by adding a DNS TXT record
3. **Configure Routing**: Point your domain to our servers with a CNAME record
4. **Activate**: Once verified and configured, activate the domain
5. **Go Live**: Your assessment is now accessible via your custom domain

## Adding a Custom Domain

### Step 1: Navigate to Custom Domains

1. Log in to your dashboard
2. Click "Custom Domains" in the sidebar
3. Click "Add Domain" button

### Step 2: Enter Domain Details

**Subdomain Setup (Recommended):**
```
Subdomain: quiz
Domain: yourdomain.com
Result: quiz.yourdomain.com
```

**Root Domain Setup:**
```
Subdomain: (leave empty)
Domain: yourdomain.com
Result: yourdomain.com
```

**Link to Assessment:**
- Select an existing published assessment from the dropdown
- You can change this mapping later
- One domain can only be linked to one assessment

### Step 3: Domain Created

After creation, you'll receive:
- Verification token (unique identifier)
- DNS record instructions
- Setup wizard

## DNS Configuration

You need to add two DNS records to your domain:

### Record 1: Verification (TXT Record)

This proves you own the domain.

```
Type: TXT
Name: _verify.quiz.yourdomain.com
Value: verify-[long-random-string]
TTL: 3600
```

**Where to add this:**
1. Log in to your domain registrar (GoDaddy, Namecheap, CloudFlare, etc.)
2. Navigate to DNS Management
3. Add new TXT record
4. Use the exact values provided in the setup wizard

### Record 2: Routing (CNAME Record)

This points your domain to our servers.

```
Type: CNAME
Name: quiz.yourdomain.com
Value: app.surveyapp.com (or your configured APP_DOMAIN)
TTL: 3600
```

**Important Notes:**
- Use CNAME for subdomains
- For root domains, some providers require ALIAS or ANAME records
- Check with your DNS provider for specific requirements

## Domain Verification

### Automatic Verification

Our system automatically checks pending domains every 5 minutes.

### Manual Verification

Click the "Verify" button on your domain card to trigger an immediate check.

### Verification Process

1. System looks up your domain's DNS records
2. Checks for the verification TXT record
3. Validates the token matches
4. Checks CNAME configuration
5. Updates domain status

### Verification Statuses

- **Pending**: Waiting for DNS records
- **Verified**: Ownership confirmed
- **Failed**: DNS records not found or incorrect

## Activating Your Domain

### Prerequisites

Before activation:
- ✅ Domain must be verified
- ✅ CNAME record must be configured
- ✅ Assessment must be linked
- ✅ Assessment must be published

### Activation Steps

1. Ensure all prerequisites are met
2. Click "Activate" button
3. Domain status changes to "Active"
4. Assessment is now accessible via custom domain

### Testing

After activation:
1. Visit your custom domain in a browser
2. You should see your assessment load
3. Test form submission
4. Verify PDF reports are sent correctly

## Troubleshooting

### Issue: Verification Fails

**Possible Causes:**
- DNS records not propagated yet (wait 15-30 minutes)
- TXT record name incorrect
- Token value doesn't match
- DNS provider not saving changes

**Solution:**
```bash
# Check DNS propagation (use online tools or command line)
nslookup -type=TXT _verify.quiz.yourdomain.com

# Should return the verification token
```

### Issue: Domain Shows "DNS Not Configured"

**Possible Causes:**
- CNAME record not added
- CNAME pointing to wrong target
- Using A record instead of CNAME

**Solution:**
```bash
# Check CNAME record
nslookup -type=CNAME quiz.yourdomain.com

# Should point to app.surveyapp.com
```

### Issue: Domain Verified But Can't Activate

**Checklist:**
- [ ] Is the assessment linked?
- [ ] Is the assessment published (not draft)?
- [ ] Is CNAME configured correctly?
- [ ] Has DNS propagated globally?

### Issue: 503 Error When Visiting Domain

**Possible Causes:**
- Domain not activated
- Domain verification failed
- Assessment not published

**Solution:**
1. Check domain status in dashboard
2. Verify DNS configuration
3. Ensure assessment is published

### Issue: SSL/HTTPS Not Working

**Current Limitation:**
SSL certificates must be configured through your hosting provider or CDN (CloudFlare, etc.)

**Recommended Approach:**
1. Use CloudFlare (free plan available)
2. Add your domain to CloudFlare
3. Enable "Always Use HTTPS"
4. CloudFlare will automatically provision SSL

## Technical Details

### Database Schema

```sql
-- Custom domains table
CREATE TABLE custom_domains (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    assessment_id UUID REFERENCES assessments(id),
    domain VARCHAR(255),
    subdomain VARCHAR(255),
    full_domain VARCHAR(255) UNIQUE,
    verification_status VARCHAR(50),
    verification_token VARCHAR(255),
    is_active BOOLEAN,
    dns_configured BOOLEAN
);
```

### How Routing Works

1. **Request arrives** at your custom domain
2. **Middleware intercepts** the request
3. **Database lookup** finds matching custom_domain record
4. **Validates** domain is active and verified
5. **Routes** to linked assessment
6. **Logs** access for analytics

### API Endpoints

```
GET    /api/custom-domains              # List all domains
POST   /api/custom-domains              # Add new domain
GET    /api/custom-domains/:id          # Get domain details
PATCH  /api/custom-domains/:id          # Update domain
DELETE /api/custom-domains/:id          # Delete domain
POST   /api/custom-domains/:id/verify   # Trigger verification
POST   /api/custom-domains/:id/activate # Activate domain
```

### DNS Verification Algorithm

```typescript
1. Resolve TXT records for _verify.{domain}
2. Check if verification_token exists in records
3. If found: mark as verified
4. If not found: check if recently added (< 30 min)
5. Schedule retry in 5 minutes
```

### CNAME Verification

```typescript
1. Resolve CNAME for {full_domain}
2. Check if points to APP_DOMAIN
3. If yes: mark dns_configured = true
4. If no: check for A record as fallback
```

## Best Practices

### DNS Management

1. **Use CloudFlare** for DNS management (free + SSL)
2. **Set TTL to 300** (5 minutes) during setup for faster propagation
3. **Increase TTL to 3600** (1 hour) after domain is stable
4. **Enable DNSSEC** for added security

### Domain Strategy

1. **Use subdomains** (easier to manage than root domains)
2. **Consistent naming**: quiz.*, assessment.*, survey.*
3. **Separate domains** for different brands/products
4. **Keep verification records** even after verification (for re-verification)

### Performance

1. **Enable CDN** (CloudFlare, AWS CloudFront)
2. **Use HTTP/2** for faster loading
3. **Enable compression** (gzip, brotli)
4. **Cache static assets**

### Security

1. **Always use HTTPS** (SSL certificate required)
2. **Enable HSTS** headers
3. **Implement CSP** (Content Security Policy)
4. **Regular security audits**

## Advanced Configuration

### Multiple Domains for One Assessment

Currently not supported directly, but you can:
1. Create multiple custom domain entries
2. Link each to the same assessment
3. Each will work independently

### Custom Branding per Domain

Configure branding in the assessment's `branding_config`:

```json
{
  "primary_color": "#3b82f6",
  "secondary_color": "#1e40af",
  "logo_url": "https://yourdomain.com/logo.png",
  "font_family": "Inter, sans-serif"
}
```

### Programmatic Domain Management

Use the API to automate domain management:

```bash
# Add domain via API
curl -X POST https://api.surveyapp.com/api/custom-domains \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "subdomain": "quiz",
    "assessment_id": "assessment-uuid"
  }'
```

### Webhook Notifications

Set up webhooks to receive notifications when:
- Domain is verified
- Domain verification fails
- Domain is accessed
- DNS configuration changes

## Deployment Considerations

### Production Setup

1. **Set APP_DOMAIN** environment variable:
   ```
   APP_DOMAIN=app.yourdomain.com
   ```

2. **Configure CORS** to allow custom domains:
   ```typescript
   app.use(cors({
     origin: true, // Allow all origins for custom domains
     credentials: true
   }));
   ```

3. **SSL Certificate Provisioning**:
   - Use Let's Encrypt with ACME
   - Or integrate with CloudFlare API
   - Or use AWS Certificate Manager

### Monitoring

Monitor these metrics:
- Verification success rate
- DNS propagation time
- Domain activation time
- Access logs per domain
- Error rates per domain

## Support

### Common DNS Providers

**GoDaddy:**
- DNS Management: Domain Details > DNS Management
- Add Record > TXT/CNAME

**Namecheap:**
- Dashboard > Domain List > Manage > Advanced DNS

**CloudFlare:**
- Dashboard > Select Domain > DNS > Add Record

**Google Domains:**
- My Domains > Manage > DNS > Custom Records

### Getting Help

If you encounter issues:
1. Check this guide first
2. Verify DNS propagation with online tools
3. Check domain status in dashboard
4. Review error messages carefully
5. Contact support with domain details

## Limits and Quotas

**Free Tier:**
- Max 1 custom domain
- Subdomain only

**Basic Tier:**
- Max 3 custom domains
- Subdomain + root domain

**Pro Tier:**
- Max 10 custom domains
- All features

**Enterprise:**
- Unlimited domains
- Priority support
- Custom SSL
- White-label options

## Changelog

**v1.0.0** - Initial Release
- Basic custom domain support
- DNS verification
- CNAME routing
- Manual SSL configuration

**Future Roadmap:**
- Automatic SSL provisioning
- Wildcard domain support
- Domain transfer/migration
- Advanced analytics
- Geographic routing
- Load balancing

---

**Last Updated:** 2024
**Version:** 1.0.0
