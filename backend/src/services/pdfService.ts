import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { ResponseWithDetails } from '../types';

export class PDFService {
  private static getPDFDirectory(): string {
    const dir = path.join(process.cwd(), 'pdfs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  static async generateReport(response: ResponseWithDetails): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const fileName = `assessment-${response.id}.pdf`;
        const filePath = path.join(this.getPDFDirectory(), fileName);

        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc
          .fontSize(24)
          .fillColor('#2c3e50')
          .text('Assessment Report', { align: 'center' })
          .moveDown(0.5);

        doc
          .fontSize(12)
          .fillColor('#7f8c8d')
          .text(`Completed: ${new Date(response.completed_at).toLocaleDateString()}`, {
            align: 'center'
          })
          .moveDown(2);

        // Respondent Information
        doc
          .fontSize(16)
          .fillColor('#2c3e50')
          .text('Respondent Information')
          .moveDown(0.5);

        doc.fontSize(12).fillColor('#34495e');
        if (response.respondent.name) {
          doc.text(`Name: ${response.respondent.name}`);
        }
        doc.text(`Email: ${response.respondent.email}`);
        if (response.respondent.company) {
          doc.text(`Company: ${response.respondent.company}`);
        }
        doc.moveDown(2);

        // Score Summary
        doc
          .fontSize(16)
          .fillColor('#2c3e50')
          .text('Score Summary')
          .moveDown(0.5);

        doc
          .fontSize(14)
          .fillColor('#27ae60')
          .text(`Total Score: ${response.total_score}`, { continued: false })
          .moveDown(0.5);

        if (response.score_range) {
          doc
            .fontSize(14)
            .fillColor('#3498db')
            .text(`Category: ${response.score_range.range_name}`)
            .moveDown(0.5);

          if (response.score_range.description) {
            doc
              .fontSize(12)
              .fillColor('#34495e')
              .text(response.score_range.description, {
                align: 'left',
                width: 500
              })
              .moveDown(1);
          }

          if (response.score_range.recommendations) {
            doc
              .fontSize(14)
              .fillColor('#2c3e50')
              .text('Recommendations')
              .moveDown(0.5);

            doc
              .fontSize(12)
              .fillColor('#34495e')
              .text(response.score_range.recommendations, {
                align: 'left',
                width: 500
              })
              .moveDown(2);
          }
        }

        // Detailed Answers
        doc.addPage();
        doc
          .fontSize(16)
          .fillColor('#2c3e50')
          .text('Detailed Responses')
          .moveDown(1);

        response.answers.forEach((answer, index) => {
          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage();
          }

          doc
            .fontSize(12)
            .fillColor('#2c3e50')
            .text(`${index + 1}. ${answer.question.question_text}`, {
              continued: false
            })
            .moveDown(0.3);

          doc
            .fontSize(11)
            .fillColor('#27ae60')
            .text(`Answer: ${answer.answer_option.option_text}`, { indent: 20 })
            .moveDown(0.3);

          doc
            .fontSize(10)
            .fillColor('#7f8c8d')
            .text(`Points: ${answer.answer_option.point_value}`, { indent: 20 })
            .moveDown(1);
        });

        // Footer
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc
            .fontSize(10)
            .fillColor('#95a5a6')
            .text(
              `Page ${i + 1} of ${pages.count}`,
              50,
              doc.page.height - 50,
              { align: 'center' }
            );
        }

        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  static async generateCustomReport(
    response: ResponseWithDetails,
    customConfig: any
  ): Promise<string> {
    // Extended version that supports custom branding, colors, logos
    // This is a placeholder for future enhancement
    return this.generateReport(response);
  }

  static getPublicURL(filePath: string): string {
    const fileName = path.basename(filePath);
    const baseUrl = process.env.APP_URL || 'http://localhost:5000';
    return `${baseUrl}/pdfs/${fileName}`;
  }

  static deletePDF(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
