import cron from 'node-cron';
import { EmailModel } from '../models/Email';
import { ResponseModel } from '../models/Response';
import { UserModel } from '../models/User';
import { AssessmentModel } from '../models/Assessment';
import { emailService } from '../services/emailService';
import { PDFService } from '../services/pdfService';
import pool from '../config/database';

export class EmailWorker {
  private isRunning = false;

  start() {
    // Run every minute
    cron.schedule('* * * * *', async () => {
      if (this.isRunning) {
        console.log('Email worker already running, skipping...');
        return;
      }

      try {
        this.isRunning = true;
        await this.processPendingEmails();
      } catch (error) {
        console.error('Email worker error:', error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('Email worker started');
  }

  private async processPendingEmails() {
    const pendingEmails = await EmailModel.getPendingEmails();

    console.log(`Processing ${pendingEmails.length} pending emails`);

    for (const delivery of pendingEmails) {
      try {
        // Get response and assessment to get user_id
        const response = await ResponseModel.findById(delivery.response_id);
        if (!response) {
          console.error(`Response not found for delivery ${delivery.id}`);
          continue;
        }

        const assessment = await AssessmentModel.findById(response.assessment_id);
        if (!assessment) {
          console.error(`Assessment not found for delivery ${delivery.id}`);
          continue;
        }

        // Get respondent details
        const respondentQuery = await pool.query(
          'SELECT * FROM respondents WHERE id = $1',
          [response.respondent_id]
        );
        const respondent = respondentQuery.rows[0];

        if (!respondent) {
          console.error(`Respondent not found for delivery ${delivery.id}`);
          continue;
        }

        // Get user's SMTP config (assessment override or user default)
        const smtpConfig = assessment.smtp_config || await UserModel.getSMTPConfig(assessment.user_id);

        // Prepare template variables
        const variables = {
          name: respondent.name || 'there',
          email: respondent.email,
          company: respondent.company || ''
        };

        // Send email with custom SMTP config
        await emailService.sendNurturingEmail(
          respondent,
          delivery as any, // Contains template fields
          variables,
          smtpConfig
        );

        // Update delivery status
        await EmailModel.updateDeliveryStatus(delivery.id, 'sent');

        console.log(`Email sent to ${respondent.email} using ${smtpConfig ? 'custom' : 'default'} SMTP`);
      } catch (error) {
        console.error(`Failed to send email ${delivery.id}:`, error);
        await EmailModel.updateDeliveryStatus(
          delivery.id,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  }

  async scheduleEmailsForResponse(responseId: string) {
    const { sequences, templates } = await EmailModel.getSequenceForResponse(responseId);

    if (!sequences.length) {
      console.log(`No email sequences found for response ${responseId}`);
      return;
    }

    const response = await ResponseModel.findById(responseId);
    if (!response) {
      console.error(`Response ${responseId} not found`);
      return;
    }

    for (const sequence of sequences) {
      const sequenceTemplates = templates.filter(t => t.sequence_id === sequence.id);

      for (const template of sequenceTemplates) {
        if (!template.active) continue;

        const scheduledFor = new Date(response.completed_at);
        scheduledFor.setDate(scheduledFor.getDate() + template.delay_days);

        await EmailModel.scheduleEmail({
          response_id: responseId,
          email_template_id: template.id,
          scheduled_for: scheduledFor
        });

        console.log(
          `Scheduled email "${template.subject}" for ${scheduledFor.toISOString()}`
        );
      }
    }
  }

  async sendImmediateReportEmail(responseId: string) {
    try {
      const response = await ResponseModel.findWithDetails(responseId);
      if (!response) {
        throw new Error('Response not found');
      }

      // Get assessment with branding
      const assessment = await AssessmentModel.findById(response.assessment_id);
      if (!assessment) {
        throw new Error('Assessment not found');
      }

      // Generate PDF
      const pdfPath = await PDFService.generateReport(response);
      const pdfUrl = PDFService.getPublicURL(pdfPath);

      // Update response with PDF info
      await ResponseModel.updatePdfInfo(responseId, pdfUrl);

      // Get user's SMTP config (assessment override or user default)
      const smtpConfig = assessment.smtp_config || await UserModel.getSMTPConfig(assessment.user_id);

      // Get branding config from assessment
      const brandingConfig = assessment.branding_config || {};

      // Send email with report, SMTP config, and branding
      await emailService.sendAssessmentReport(
        response.respondent,
        response,
        pdfUrl,
        assessment.title,
        smtpConfig,
        brandingConfig
      );

      // Mark email as sent
      await ResponseModel.markEmailSent(responseId);

      console.log(`Report email sent for response ${responseId} using ${smtpConfig ? 'custom' : 'default'} SMTP`);

      // Schedule nurturing emails
      await this.scheduleEmailsForResponse(responseId);
    } catch (error) {
      console.error(`Failed to send report email for response ${responseId}:`, error);
      throw error;
    }
  }
}

export const emailWorker = new EmailWorker();
