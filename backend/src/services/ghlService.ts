import axios, { AxiosInstance } from 'axios';
import { GHLIntegrationModel } from '../models/GHLIntegration';

export class GHLService {
  private client: AxiosInstance;
  private apiKey: string;
  private locationId: string;

  constructor(apiKey: string, locationId: string) {
    this.apiKey = apiKey;
    this.locationId = locationId;

    this.client = axios.create({
      baseURL: 'https://rest.gohighlevel.com/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create or update a contact in GHL
   */
  async upsertContact(data: {
    email: string;
    name?: string;
    phone?: string;
    companyName?: string;
    customFields?: Record<string, any>;
    tags?: string[];
    source?: string;
  }): Promise<{ contactId: string; created: boolean }> {
    try {
      // First, try to find existing contact by email
      const existingContact = await this.findContactByEmail(data.email);

      if (existingContact) {
        // Update existing contact
        await this.updateContact(existingContact.id, {
          firstName: this.extractFirstName(data.name),
          lastName: this.extractLastName(data.name),
          phone: data.phone,
          companyName: data.companyName,
          customFields: data.customFields,
          tags: data.tags,
        });

        return {
          contactId: existingContact.id,
          created: false,
        };
      } else {
        // Create new contact
        const response = await this.client.post('/contacts/', {
          locationId: this.locationId,
          email: data.email,
          firstName: this.extractFirstName(data.name),
          lastName: this.extractLastName(data.name),
          phone: data.phone,
          companyName: data.companyName,
          customFields: data.customFields,
          tags: data.tags,
          source: data.source || 'Survey App',
        });

        return {
          contactId: response.data.contact.id,
          created: true,
        };
      }
    } catch (error: any) {
      console.error('GHL upsert contact error:', error.response?.data || error.message);
      throw new Error(`Failed to upsert contact: ${error.message}`);
    }
  }

  /**
   * Find contact by email
   */
  async findContactByEmail(email: string): Promise<any | null> {
    try {
      const response = await this.client.get('/contacts/', {
        params: {
          locationId: this.locationId,
          email: email,
        },
      });

      if (response.data.contacts && response.data.contacts.length > 0) {
        return response.data.contacts[0];
      }

      return null;
    } catch (error) {
      console.error('GHL find contact error:', error);
      return null;
    }
  }

  /**
   * Update existing contact
   */
  async updateContact(contactId: string, data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    companyName?: string;
    customFields?: Record<string, any>;
    tags?: string[];
  }): Promise<void> {
    try {
      await this.client.put(`/contacts/${contactId}`, {
        locationId: this.locationId,
        ...data,
      });
    } catch (error: any) {
      console.error('GHL update contact error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Add tags to contact
   */
  async addTagsToContact(contactId: string, tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        await this.client.post(`/contacts/${contactId}/tags`, {
          locationId: this.locationId,
          tags: [tag],
        });
      }
    } catch (error: any) {
      console.error('GHL add tags error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Add contact to workflow/campaign
   */
  async addToWorkflow(contactId: string, workflowId: string): Promise<void> {
    try {
      await this.client.post(`/contacts/${contactId}/campaigns/${workflowId}`, {
        locationId: this.locationId,
      });
    } catch (error: any) {
      console.error('GHL add to workflow error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create or update custom field
   */
  async upsertCustomField(data: {
    key: string;
    name: string;
    fieldType: 'TEXT' | 'LARGE_TEXT' | 'NUMBER' | 'PHONE' | 'EMAIL' | 'DATE' | 'CHECKBOX' | 'SELECT';
    placeholder?: string;
    options?: string[];
  }): Promise<void> {
    try {
      await this.client.post('/custom-fields/', {
        locationId: this.locationId,
        ...data,
      });
    } catch (error: any) {
      // Field might already exist, which is okay
      if (error.response?.status !== 409) {
        console.error('GHL create custom field error:', error.response?.data || error.message);
      }
    }
  }

  /**
   * Get all custom fields for location
   */
  async getCustomFields(): Promise<any[]> {
    try {
      const response = await this.client.get('/custom-fields/', {
        params: {
          locationId: this.locationId,
        },
      });

      return response.data.customFields || [];
    } catch (error: any) {
      console.error('GHL get custom fields error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Create a note on contact
   */
  async addNoteToContact(contactId: string, note: string): Promise<void> {
    try {
      await this.client.post(`/contacts/${contactId}/notes/`, {
        locationId: this.locationId,
        body: note,
      });
    } catch (error: any) {
      console.error('GHL add note error:', error.response?.data || error.message);
    }
  }

  /**
   * Create a task for contact
   */
  async createTask(contactId: string, data: {
    title: string;
    description?: string;
    dueDate?: Date;
    assignedTo?: string;
  }): Promise<void> {
    try {
      await this.client.post('/tasks/', {
        locationId: this.locationId,
        contactId: contactId,
        title: data.title,
        body: data.description,
        dueDate: data.dueDate?.toISOString(),
        assignedTo: data.assignedTo,
      });
    } catch (error: any) {
      console.error('GHL create task error:', error.response?.data || error.message);
    }
  }

  /**
   * Send assessment results to GHL
   */
  async syncAssessmentResults(data: {
    respondent: any;
    response: any;
    assessment: any;
    answers: any[];
    scoreRange?: any;
    fieldMappings: any[];
    tags?: string[];
    workflowIds?: string[];
  }): Promise<{ success: boolean; contactId?: string; error?: string }> {
    try {
      // Prepare custom fields based on mappings
      const customFields: Record<string, any> = {};

      for (const mapping of data.fieldMappings) {
        let value: any;

        // Map source field to value
        if (mapping.source_field === 'score') {
          value = data.response.total_score;
        } else if (mapping.source_field === 'score_range') {
          value = data.scoreRange?.range_name;
        } else if (mapping.source_field === 'score_range_description') {
          value = data.scoreRange?.description;
        } else if (mapping.source_field === 'assessment_title') {
          value = data.assessment.title;
        } else if (mapping.source_field.startsWith('question_')) {
          // Extract question ID from field name
          const questionId = mapping.source_field.replace('question_', '');
          const answer = data.answers.find(a => a.question_id === questionId);
          value = answer?.answer_option?.option_text;
        } else if (mapping.source_field === 'respondent_name') {
          value = data.respondent.name;
        } else if (mapping.source_field === 'respondent_email') {
          value = data.respondent.email;
        } else if (mapping.source_field === 'respondent_phone') {
          value = data.respondent.phone;
        } else if (mapping.source_field === 'respondent_company') {
          value = data.respondent.company;
        }

        // Apply transformation if specified
        if (value && mapping.transform_function) {
          value = this.transformValue(value, mapping.transform_function);
        }

        if (value !== undefined) {
          customFields[mapping.ghl_field_key] = value;
        }
      }

      // Upsert contact
      const result = await this.upsertContact({
        email: data.respondent.email,
        name: data.respondent.name,
        phone: data.respondent.phone,
        companyName: data.respondent.company,
        customFields,
        tags: data.tags,
        source: `Survey: ${data.assessment.title}`,
      });

      // Add to workflows if specified
      if (data.workflowIds && data.workflowIds.length > 0) {
        for (const workflowId of data.workflowIds) {
          await this.addToWorkflow(result.contactId, workflowId);
        }
      }

      // Add note with full assessment details
      const noteContent = this.buildAssessmentNote(data);
      await this.addNoteToContact(result.contactId, noteContent);

      return {
        success: true,
        contactId: result.contactId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.client.get('/locations/' + this.locationId);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  // Helper methods
  private extractFirstName(fullName?: string): string {
    if (!fullName) return '';
    return fullName.split(' ')[0];
  }

  private extractLastName(fullName?: string): string {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  private transformValue(value: any, transformFunction: string): any {
    switch (transformFunction) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'capitalize':
        return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
      case 'format_phone':
        return String(value).replace(/\D/g, '');
      case 'format_date':
        return new Date(value).toLocaleDateString();
      default:
        return value;
    }
  }

  private buildAssessmentNote(data: any): string {
    let note = `📊 Assessment Completed: ${data.assessment.title}\n\n`;
    note += `Score: ${data.response.total_score}\n`;

    if (data.scoreRange) {
      note += `Category: ${data.scoreRange.range_name}\n`;
      if (data.scoreRange.description) {
        note += `\nDescription:\n${data.scoreRange.description}\n`;
      }
    }

    note += `\n--- Detailed Answers ---\n\n`;

    for (const answer of data.answers) {
      note += `Q: ${answer.question.question_text}\n`;
      note += `A: ${answer.answer_option.option_text} (${answer.answer_option.point_value} pts)\n\n`;
    }

    note += `Completed: ${new Date(data.response.completed_at).toLocaleString()}`;

    return note;
  }
}

/**
 * Create GHL service instance from integration
 */
export async function createGHLServiceFromIntegration(
  integrationId: string
): Promise<GHLService> {
  const integration = await GHLIntegrationModel.findById(integrationId);

  if (!integration) {
    throw new Error('GHL integration not found');
  }

  if (!integration.is_active) {
    throw new Error('GHL integration is not active');
  }

  return new GHLService(integration.api_key, integration.location_id);
}

/**
 * Create GHL service instance from user ID
 */
export async function createGHLServiceFromUser(userId: string): Promise<GHLService | null> {
  const integration = await GHLIntegrationModel.findActiveByUserId(userId);

  if (!integration) {
    return null;
  }

  return new GHLService(integration.api_key, integration.location_id);
}
