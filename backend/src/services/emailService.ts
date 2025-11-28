import nodemailer from 'nodemailer';
import { EmailTemplate, Response, Respondent } from '../types';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure based on environment variables
    if (process.env.SENDGRID_API_KEY) {
      // SendGrid configuration
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    } else if (process.env.MAILGUN_API_KEY) {
      // Mailgun configuration
      const domain = process.env.MAILGUN_DOMAIN || '';
      this.transporter = nodemailer.createTransport({
        host: `smtp.mailgun.org`,
        port: 587,
        secure: false,
        auth: {
          user: `postmaster@${domain}`,
          pass: process.env.MAILGUN_API_KEY
        }
      });
    } else {
      // Development: Use ethereal email (test account)
      console.warn('No email service configured. Using test account for development.');
      nodemailer.createTestAccount().then(account => {
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: account.user,
            pass: account.pass
          }
        });
      });
    }
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    try {
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.MAILGUN_FROM_EMAIL || 'noreply@surveyapp.com';
      const fromName = process.env.SENDGRID_FROM_NAME || 'Survey App';

      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      });

      console.log('Email sent:', info.messageId);

      // For development with Ethereal
      if (process.env.NODE_ENV === 'development') {
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  async sendAssessmentReport(
    respondent: Respondent,
    response: Response,
    pdfUrl: string,
    assessmentTitle: string
  ): Promise<void> {
    const subject = `Your ${assessmentTitle} Results`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3498db; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .score { font-size: 24px; color: #27ae60; font-weight: bold; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #7f8c8d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${assessmentTitle}</h1>
            <p>Your Assessment Results</p>
          </div>
          <div class="content">
            <p>Hello ${respondent.name || 'there'},</p>
            <p>Thank you for completing the ${assessmentTitle} assessment!</p>
            <div class="score">Your Score: ${response.total_score}</div>
            <p>We've generated a detailed report with your results and personalized recommendations.</p>
            <a href="${pdfUrl}" class="button">Download Your Report</a>
            <p style="margin-top: 20px;">You'll be receiving additional resources and insights over the coming days to help you improve.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      ${assessmentTitle}
      Your Assessment Results

      Hello ${respondent.name || 'there'},

      Thank you for completing the ${assessmentTitle} assessment!

      Your Score: ${response.total_score}

      We've generated a detailed report with your results and personalized recommendations.

      Download your report: ${pdfUrl}

      You'll be receiving additional resources and insights over the coming days to help you improve.
    `;

    await this.sendEmail({
      to: respondent.email,
      subject,
      html,
      text
    });
  }

  async sendNurturingEmail(
    respondent: Respondent,
    template: EmailTemplate,
    variables: Record<string, string>
  ): Promise<void> {
    // Replace variables in template
    let html = template.body_html;
    let text = template.body_text;
    let subject = template.subject;

    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, variables[key]);
      text = text.replace(regex, variables[key]);
      subject = subject.replace(regex, variables[key]);
    });

    await this.sendEmail({
      to: respondent.email,
      subject,
      html,
      text
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service is ready');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
