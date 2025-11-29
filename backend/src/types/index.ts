export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  company_name?: string;
  role: 'super_admin' | 'assistant_admin' | 'client' | 'respondent';
  created_by?: string;
  subscription_tier: 'free' | 'basic' | 'pro' | 'enterprise';
  subscription_status: 'active' | 'inactive' | 'trial' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

export interface Assessment {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  industry?: string;
  target_avatar?: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  branding_config: BrandingConfig;
  created_at: Date;
  updated_at: Date;
}

export interface BrandingConfig {
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  font_family?: string;
  custom_css?: string;
}

export interface Question {
  id: string;
  assessment_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'single_choice';
  order_index: number;
  required: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AnswerOption {
  id: string;
  question_id: string;
  option_text: string;
  point_value: number;
  order_index: number;
  created_at: Date;
}

export interface ScoreRange {
  id: string;
  assessment_id: string;
  range_name: string;
  min_score: number;
  max_score: number;
  description?: string;
  recommendations?: string;
  pdf_template_config: PDFTemplateConfig;
  created_at: Date;
  updated_at: Date;
}

export interface PDFTemplateConfig {
  header_text?: string;
  footer_text?: string;
  include_chart?: boolean;
  custom_message?: string;
}

export interface Respondent {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  company?: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Response {
  id: string;
  assessment_id: string;
  respondent_id: string;
  total_score: number;
  score_range_id?: string;
  completed_at: Date;
  pdf_generated: boolean;
  pdf_url?: string;
  email_sent: boolean;
  created_at: Date;
}

export interface ResponseAnswer {
  id: string;
  response_id: string;
  question_id: string;
  answer_option_id: string;
  created_at: Date;
}

export interface EmailSequence {
  id: string;
  assessment_id: string;
  name: string;
  trigger_type: 'immediate' | 'score_based' | 'time_delayed';
  score_range_id?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface EmailTemplate {
  id: string;
  sequence_id: string;
  subject: string;
  body_html: string;
  body_text: string;
  delay_days: number;
  order_index: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface EmailDelivery {
  id: string;
  response_id: string;
  email_template_id: string;
  sent_at?: Date;
  delivered_at?: Date;
  opened_at?: Date;
  clicked_at?: Date;
  status: 'scheduled' | 'sent' | 'delivered' | 'failed' | 'bounced';
  error_message?: string;
  scheduled_for?: Date;
  created_at: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'super_admin' | 'assistant_admin' | 'client' | 'respondent';
}

export interface AssessmentWithDetails extends Assessment {
  questions: QuestionWithOptions[];
  score_ranges: ScoreRange[];
}

export interface QuestionWithOptions extends Question {
  answer_options: AnswerOption[];
}

export interface ResponseWithDetails extends Response {
  respondent: Respondent;
  answers: ResponseAnswerWithDetails[];
  score_range?: ScoreRange;
}

export interface ResponseAnswerWithDetails extends ResponseAnswer {
  question: Question;
  answer_option: AnswerOption;
}
