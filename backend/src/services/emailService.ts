import nodemailer from 'nodemailer';
import { EmailTemplate, Response, Respondent } from '../types';

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from_email: string;
  from_name: string;
}

export class EmailService {
  private defaultTransporter: nodemailer.Transporter | null = null;

  constructor() {
    // Initialize default transporter for system emails
    this.initializeDefaultTransporter();
  }

  private async initializeDefaultTransporter() {
    // Use environment SMTP config as fallback for system emails
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.defaultTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      // Development: Use ethereal email (test account)
      console.warn('No SMTP configured. Using test account for development.');
      try {
        const account = await nodemailer.createTestAccount();
        this.defaultTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: account.user,
            pass: account.pass
          }
        });
        console.log('Using Ethereal test account:', account.user);
      } catch (error) {
        console.error('Failed to create test email account:', error);
      }
    }
  }

  /**
   * Create a transporter from SMTP configuration
   */
  private createTransporter(smtpConfig: SMTPConfig): nodemailer.Transporter {
    return nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.auth.user,
        pass: smtpConfig.auth.pass
      }
    });
  }

  /**
   * Get transporter for a specific SMTP config or use default
   */
  private getTransporter(smtpConfig?: SMTPConfig | null): nodemailer.Transporter {
    if (smtpConfig && smtpConfig.host && smtpConfig.auth) {
      return this.createTransporter(smtpConfig);
    }

    if (!this.defaultTransporter) {
      throw new Error('No email transporter configured');
    }

    return this.defaultTransporter;
  }

  /**
   * Send email using custom SMTP config or default
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
    smtpConfig?: SMTPConfig | null;
  }): Promise<void> {
    try {
      const transporter = this.getTransporter(options.smtpConfig);

      // Determine from email and name
      const fromEmail = options.smtpConfig?.from_email ||
                       process.env.SMTP_FROM_EMAIL ||
                       'noreply@surveyapp.com';
      const fromName = options.smtpConfig?.from_name ||
                      process.env.SMTP_FROM_NAME ||
                      'Survey App';

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      });

      console.log('Email sent:', info.messageId);

      // For development with Ethereal
      if (process.env.NODE_ENV === 'development' && !options.smtpConfig) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log('Preview URL:', previewUrl);
        }
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  /**
   * Send assessment report with custom branding
   */
  async sendAssessmentReport(
    respondent: Respondent,
    response: Response,
    pdfUrl: string,
    assessmentTitle: string,
    smtpConfig?: SMTPConfig | null,
    brandingConfig?: {
      primary_color?: string;
      logo_url?: string;
      company_name?: string;
    }
  ): Promise<void> {
    const primaryColor = brandingConfig?.primary_color || '#3498db';
    const logoUrl = brandingConfig?.logo_url;
    const companyName = brandingConfig?.company_name ||
                       smtpConfig?.from_name ||
                       'Survey App';

    const subject = `Your ${assessmentTitle} Results`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${primaryColor}; color: white; padding: 20px; text-align: center; }
          .logo { max-width: 200px; margin-bottom: 10px; }
          .content { padding: 20px; background: #f9f9f9; }
          .score { font-size: 24px; color: #27ae60; font-weight: bold; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: ${primaryColor}; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #7f8c8d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="logo" />` : ''}
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
            <p>${companyName} | This is an automated message.</p>
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

      ${companyName}
    `;

    await this.sendEmail({
      to: respondent.email,
      subject,
      html,
      text,
      smtpConfig
    });
  }

  /**
   * Send nurturing email with custom branding
   */
  async sendNurturingEmail(
    respondent: Respondent,
    template: EmailTemplate,
    variables: Record<string, string>,
    smtpConfig?: SMTPConfig | null
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
      text,
      smtpConfig
    });
  }

  /**
   * Test SMTP connection
   */
  async testConnection(smtpConfig?: SMTPConfig | null): Promise<boolean> {
    try {
      const transporter = this.getTransporter(smtpConfig);
      await transporter.verify();
      console.log('SMTP connection verified');
      return true;
    } catch (error) {
      console.error('SMTP connection failed:', error);
      return false;
    }
  }

  /**
   * Test sending an email with specific SMTP config
   */
  async testSMTPConfig(smtpConfig: SMTPConfig, testEmail: string): Promise<boolean> {
    try {
      await this.sendEmail({
        to: testEmail,
        subject: 'SMTP Configuration Test',
        html: '<p>This is a test email to verify your SMTP configuration.</p>',
        text: 'This is a test email to verify your SMTP configuration.',
        smtpConfig
      });
      return true;
    } catch (error) {
      console.error('SMTP test failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
