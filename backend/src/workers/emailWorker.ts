import cron from 'node-cron';
import { EmailModel } from '../models/Email';
import { ResponseModel } from '../models/Response';
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
        // Get respondent details
        const respondentQuery = await pool.query(
          'SELECT * FROM respondents WHERE id = $1',
          [delivery.response_id]
        );
        const respondent = respondentQuery.rows[0];

        if (!respondent) {
          console.error(`Respondent not found for delivery ${delivery.id}`);
          continue;
        }

        // Prepare template variables
        const variables = {
          name: respondent.name || 'there',
          email: respondent.email,
          company: respondent.company || ''
        };

        // Send email
        await emailService.sendNurturingEmail(
          respondent,
          delivery as any, // Contains template fields
          variables
        );

        // Update delivery status
        await EmailModel.updateDeliveryStatus(delivery.id, 'sent');

        console.log(`Email sent to ${respondent.email}`);
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

      // Generate PDF
      const pdfPath = await PDFService.generateReport(response);
      const pdfUrl = PDFService.getPublicURL(pdfPath);

      // Update response with PDF info
      await ResponseModel.updatePdfInfo(responseId, pdfUrl);

      // Get assessment title
      const assessmentQuery = await pool.query(
        'SELECT title FROM assessments WHERE id = $1',
        [response.assessment_id]
      );
      const assessmentTitle = assessmentQuery.rows[0]?.title || 'Assessment';

      // Send email with report
      await emailService.sendAssessmentReport(
        response.respondent,
        response,
        pdfUrl,
        assessmentTitle
      );

      // Mark email as sent
      await ResponseModel.markEmailSent(responseId);

      console.log(`Report email sent for response ${responseId}`);

      // Schedule nurturing emails
      await this.scheduleEmailsForResponse(responseId);
    } catch (error) {
      console.error(`Failed to send report email for response ${responseId}:`, error);
      throw error;
    }
  }
}

export const emailWorker = new EmailWorker();
