import dns from 'dns/promises';
import { CustomDomainModel } from '../models/CustomDomain';

export class DomainVerificationService {
  /**
   * Verify domain ownership via DNS TXT record
   */
  static async verifyDNS(customDomainId: string): Promise<{
    verified: boolean;
    records: any[];
    message: string;
  }> {
    try {
      const domain = await CustomDomainModel.findById(customDomainId);
      if (!domain) {
        return { verified: false, records: [], message: 'Domain not found' };
      }

      const verificationRecords = await CustomDomainModel.getVerificationRecords(customDomainId);
      const txtRecord = verificationRecords.find(r => r.record_type === 'TXT');

      if (!txtRecord) {
        return { verified: false, records: [], message: 'No TXT record configured' };
      }

      // Look up TXT records for the verification subdomain
      const lookupDomain = txtRecord.record_name;

      try {
        const records = await dns.resolveTxt(lookupDomain);
        const flatRecords = records.map(r => r.join(''));

        // Check if our verification token exists in the TXT records
        const tokenFound = flatRecords.some(record =>
          record.includes(domain.verification_token)
        );

        if (tokenFound) {
          await CustomDomainModel.markRecordAsVerified(txtRecord.id);
          await CustomDomainModel.markAsVerified(customDomainId);

          return {
            verified: true,
            records: flatRecords,
            message: 'Domain verified successfully'
          };
        }

        return {
          verified: false,
          records: flatRecords,
          message: `Verification token not found. Expected: ${domain.verification_token}`
        };
      } catch (dnsError: any) {
        if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA') {
          return {
            verified: false,
            records: [],
            message: 'DNS records not found. Please ensure TXT record is configured.'
          };
        }
        throw dnsError;
      }
    } catch (error: any) {
      console.error('Domain verification error:', error);
      return {
        verified: false,
        records: [],
        message: error.message || 'Verification failed'
      };
    }
  }

  /**
   * Verify CNAME/A record configuration
   */
  static async verifyCNAME(customDomainId: string, expectedTarget: string): Promise<{
    configured: boolean;
    actual?: string;
    message: string;
  }> {
    try {
      const domain = await CustomDomainModel.findById(customDomainId);
      if (!domain) {
        return { configured: false, message: 'Domain not found' };
      }

      try {
        // Try to resolve CNAME first
        const cnameRecords = await dns.resolveCname(domain.full_domain);

        if (cnameRecords && cnameRecords.length > 0) {
          const target = cnameRecords[0].toLowerCase();
          const expected = expectedTarget.toLowerCase();

          if (target === expected || target === `${expected}.`) {
            await CustomDomainModel.update(customDomainId, {
              dns_configured: true,
              last_checked_at: new Date()
            });

            return {
              configured: true,
              actual: target,
              message: 'CNAME configured correctly'
            };
          }

          return {
            configured: false,
            actual: target,
            message: `CNAME points to wrong target. Expected: ${expected}, Got: ${target}`
          };
        }
      } catch (cnameError: any) {
        // CNAME not found, try A record
        if (cnameError.code === 'ENODATA') {
          try {
            const aRecords = await dns.resolve4(domain.full_domain);
            if (aRecords && aRecords.length > 0) {
              // A record exists but we prefer CNAME
              return {
                configured: false,
                actual: `A: ${aRecords.join(', ')}`,
                message: 'A record found but CNAME is recommended'
              };
            }
          } catch (aError) {
            // Neither CNAME nor A record
          }
        }
      }

      return {
        configured: false,
        message: 'No DNS records found. Please configure CNAME record.'
      };
    } catch (error: any) {
      console.error('CNAME verification error:', error);
      return {
        configured: false,
        message: error.message || 'DNS check failed'
      };
    }
  }

  /**
   * Get DNS configuration instructions for a domain
   */
  static async getDNSInstructions(customDomainId: string): Promise<{
    verification: any;
    routing: any;
  }> {
    const domain = await CustomDomainModel.findById(customDomainId);
    if (!domain) {
      throw new Error('Domain not found');
    }

    const appDomain = process.env.APP_DOMAIN || 'app.surveyapp.com';

    return {
      verification: {
        type: 'TXT',
        name: `_verify.${domain.full_domain}`,
        value: domain.verification_token,
        ttl: 3600,
        instructions: [
          'Log in to your domain registrar or DNS provider',
          'Navigate to DNS settings',
          `Add a TXT record with name: _verify.${domain.full_domain}`,
          `Set the value to: ${domain.verification_token}`,
          'Save the record and wait for DNS propagation (5-30 minutes)',
          'Click "Verify" button to check verification status'
        ]
      },
      routing: {
        type: 'CNAME',
        name: domain.full_domain,
        value: appDomain,
        ttl: 3600,
        instructions: [
          'After verification is complete, configure routing:',
          `Add a CNAME record for: ${domain.full_domain}`,
          `Point it to: ${appDomain}`,
          'Save the record',
          'Wait for DNS propagation',
          'Your custom domain will become active'
        ]
      }
    };
  }

  /**
   * Check SSL certificate status (placeholder - actual implementation depends on provider)
   */
  static async checkSSL(customDomainId: string): Promise<{
    active: boolean;
    issuer?: string;
    expiresAt?: Date;
    message: string;
  }> {
    // This is a placeholder. In production, you would:
    // 1. Use Let's Encrypt ACME protocol
    // 2. Integrate with CloudFlare API
    // 3. Use AWS Certificate Manager
    // 4. Or your hosting provider's SSL API

    const domain = await CustomDomainModel.findById(customDomainId);
    if (!domain) {
      return { active: false, message: 'Domain not found' };
    }

    // For now, we'll mark as pending and require manual SSL setup
    return {
      active: false,
      message: 'SSL certificate provisioning is manual. Configure SSL through your hosting provider.'
    };
  }

  /**
   * Run automatic verification check for pending domains
   */
  static async runAutomaticVerification(): Promise<{
    checked: number;
    verified: number;
    failed: number;
  }> {
    const pendingDomains = await CustomDomainModel.getPendingVerifications();

    let verified = 0;
    let failed = 0;

    for (const domain of pendingDomains) {
      try {
        const result = await this.verifyDNS(domain.id);

        if (result.verified) {
          verified++;

          // Also check CNAME
          const appDomain = process.env.APP_DOMAIN || 'app.surveyapp.com';
          await this.verifyCNAME(domain.id, appDomain);
        } else {
          // Mark as checked but not verified yet
          await CustomDomainModel.update(domain.id, {
            last_checked_at: new Date()
          });
        }
      } catch (error) {
        console.error(`Verification failed for domain ${domain.id}:`, error);
        failed++;
        await CustomDomainModel.markAsFailed(domain.id);
      }
    }

    return {
      checked: pendingDomains.length,
      verified,
      failed
    };
  }

  /**
   * Validate domain format
   */
  static validateDomain(domain: string): {
    valid: boolean;
    message?: string;
  } {
    // Remove protocol if present
    domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Basic domain validation
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

    if (!domainRegex.test(domain)) {
      return {
        valid: false,
        message: 'Invalid domain format. Use format: example.com or subdomain.example.com'
      };
    }

    // Check for reserved/invalid domains
    const reservedDomains = ['localhost', 'example.com', 'test.com', 'localhost.com'];
    if (reservedDomains.some(reserved => domain.includes(reserved))) {
      return {
        valid: false,
        message: 'Reserved or test domains are not allowed'
      };
    }

    // Check length
    if (domain.length > 253) {
      return {
        valid: false,
        message: 'Domain name is too long (max 253 characters)'
      };
    }

    return { valid: true };
  }

  /**
   * Parse domain into base and subdomain
   */
  static parseDomain(fullDomain: string): {
    domain: string;
    subdomain?: string;
  } {
    const parts = fullDomain.split('.');

    if (parts.length === 2) {
      // No subdomain (e.g., example.com)
      return { domain: fullDomain };
    } else if (parts.length > 2) {
      // Has subdomain (e.g., quiz.example.com)
      const subdomain = parts.slice(0, -2).join('.');
      const domain = parts.slice(-2).join('.');
      return { domain, subdomain };
    }

    return { domain: fullDomain };
  }
}
