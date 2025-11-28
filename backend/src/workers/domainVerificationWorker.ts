import cron from 'node-cron';
import { DomainVerificationService } from '../services/domainVerificationService';

export class DomainVerificationWorker {
  private isRunning = false;

  start() {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      if (this.isRunning) {
        console.log('Domain verification worker already running, skipping...');
        return;
      }

      try {
        this.isRunning = true;
        await this.verifyPendingDomains();
      } catch (error) {
        console.error('Domain verification worker error:', error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('Domain verification worker started (runs every 5 minutes)');
  }

  private async verifyPendingDomains() {
    console.log('Running automatic domain verification...');

    const results = await DomainVerificationService.runAutomaticVerification();

    console.log(
      `Domain verification complete: ${results.checked} checked, ` +
      `${results.verified} verified, ${results.failed} failed`
    );
  }

  async runManual() {
    console.log('Running manual domain verification...');
    return await this.verifyPendingDomains();
  }
}

export const domainVerificationWorker = new DomainVerificationWorker();
