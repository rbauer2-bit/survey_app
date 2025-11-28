# GoHighLevel Integration Guide

Complete guide for integrating your Survey App with GoHighLevel CRM to automatically sync assessment results, create contacts, apply tags, and trigger workflows.

## Table of Contents
1. [Overview](#overview)
2. [Setup](#setup)
3. [Field Mapping](#field-mapping)
4. [Workflows & Automation](#workflows--automation)
5. [API Reference](#api-reference)
6. [Troubleshooting](#troubleshooting)

## Overview

The GHL integration automatically syncs assessment data to your GoHighLevel account when respondents complete assessments. This enables:

- **Automatic Contact Creation**: Creates or updates contacts in GHL
- **Custom Field Mapping**: Maps assessment data to GHL custom fields
- **Score Tracking**: Stores assessment scores and categories
- **Tag Application**: Applies tags based on score ranges
- **Workflow Triggers**: Triggers GHL workflows/campaigns automatically
- **Detailed Notes**: Adds comprehensive assessment details as contact notes

## Setup

### Step 1: Get Your GHL API Key

1. Log in to your GoHighLevel account
2. Navigate to **Settings** → **Integrations** → **API Key**
3. Click **Create API Key** or copy existing key
4. Copy your **Location ID** (found in Settings → Company)

### Step 2: Add Integration in Survey App

1. Log in to your Survey App dashboard
2. Navigate to **Settings** → **Integrations** → **GoHighLevel**
3. Click **Connect GHL Account**
4. Enter your:
   - **Location ID**: Your GHL location identifier
   - **API Key**: Your GHL API key
5. Click **Test Connection** to verify
6. Click **Save**

### Step 3: Verify Connection

The system will test the connection automatically. If successful, you'll see:
- ✅ Successfully connected to GHL
- Last sync status
- Integration status: Active

## Field Mapping

Map assessment fields to GHL custom fields to store specific data.

### Available Source Fields

**Respondent Fields:**
- `respondent_name` - Full name
- `respondent_email` - Email address
- `respondent_phone` - Phone number
- `respondent_company` - Company name

**Assessment Fields:**
- `score` - Total assessment score (number)
- `score_range` - Score category name (text)
- `score_range_description` - Category description (text)
- `assessment_title` - Assessment name (text)

**Question Fields:**
- `question_{id}` - Specific question answer
  - Example: `question_abc-123` for question with ID abc-123

### Setting Up Field Mappings

**Via API:**
```bash
POST /api/ghl-integrations/{integration_id}/field-mappings
{
  "assessment_id": "optional-assessment-uuid",
  "source_field": "score",
  "ghl_field_key": "assessment_score",
  "ghl_field_type": "NUMBER",
  "transform_function": null
}
```

**Common Mappings:**

1. **Score to Custom Field:**
   - Source: `score`
   - GHL Field: `assessment_score`
   - Type: NUMBER

2. **Score Range to Custom Field:**
   - Source: `score_range`
   - GHL Field: `lead_category`
   - Type: TEXT

3. **Question Answer to Custom Field:**
   - Source: `question_abc-123`
   - GHL Field: `q1_answer`
   - Type: TEXT

### Transform Functions

Apply transformations to values before syncing:

- `uppercase` - Convert to uppercase
- `lowercase` - Convert to lowercase
- `capitalize` - Capitalize first letter
- `format_phone` - Remove non-numeric characters
- `format_date` - Format as date string

Example:
```json
{
  "source_field": "respondent_name",
  "ghl_field_key": "full_name",
  "transform_function": "uppercase"
}
```

## Workflows & Automation

### Tag Rules

Apply tags to contacts based on assessment results.

**Apply on Completion:**
```bash
POST /api/ghl-integrations/{integration_id}/tag-rules
{
  "assessment_id": "assessment-uuid",
  "tag_name": "Completed Assessment",
  "apply_on": "completion"
}
```

**Apply on Score Range:**
```bash
POST /api/ghl-integrations/{integration_id}/tag-rules
{
  "assessment_id": "assessment-uuid",
  "score_range_id": "score-range-uuid",
  "tag_name": "High Scorer",
  "apply_on": "score_range"
}
```

### Workflow Triggers

Automatically add contacts to GHL workflows/campaigns.

**Trigger for All Completions:**
```bash
POST /api/ghl-integrations/{integration_id}/workflow-triggers
{
  "assessment_id": "assessment-uuid",
  "ghl_workflow_id": "workflow-123",
  "trigger_type": "all_completions"
}
```

**Trigger for Specific Score Range:**
```bash
POST /api/ghl-integrations/{integration_id}/workflow-triggers
{
  "assessment_id": "assessment-uuid",
  "score_range_id": "score-range-uuid",
  "ghl_workflow_id": "workflow-456",
  "trigger_type": "score_range"
}
```

### Example Automation Scenarios

**Scenario 1: Lead Qualification**
```
Assessment: Marketing Maturity
Score Ranges:
  - 0-30: Beginner → Tag: "Nurture Lead" → Workflow: "Educational Series"
  - 31-70: Intermediate → Tag: "Qualified Lead" → Workflow: "Sales Follow-up"
  - 71-100: Advanced → Tag: "Hot Lead" → Workflow: "Demo Booking"
```

**Scenario 2: Service Recommendation**
```
Assessment: Business Needs
Field Mappings:
  - score → custom_field: assessment_score
  - score_range → custom_field: service_tier
  - question_budget → custom_field: budget_range

Workflow: Based on service_tier, trigger appropriate sales workflow
```

## API Reference

### Create Integration

```http
POST /api/ghl-integrations
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "location_id": "ghl-location-id",
  "api_key": "ghl-api-key"
}
```

### Get Integrations

```http
GET /api/ghl-integrations
Authorization: Bearer {jwt_token}
```

### Test Connection

```http
POST /api/ghl-integrations/{id}/test
Authorization: Bearer {jwt_token}
```

### Get GHL Custom Fields

```http
GET /api/ghl-integrations/{id}/custom-fields
Authorization: Bearer {jwt_token}
```

### Create Field Mapping

```http
POST /api/ghl-integrations/{id}/field-mappings
Content-Type: application/json

{
  "source_field": "score",
  "ghl_field_key": "assessment_score",
  "ghl_field_type": "NUMBER"
}
```

### Create Tag Rule

```http
POST /api/ghl-integrations/{id}/tag-rules
Content-Type: application/json

{
  "assessment_id": "uuid",
  "tag_name": "Assessment Complete",
  "apply_on": "completion"
}
```

### Create Workflow Trigger

```http
POST /api/ghl-integrations/{id}/workflow-triggers
Content-Type: application/json

{
  "assessment_id": "uuid",
  "ghl_workflow_id": "workflow-id",
  "trigger_type": "all_completions"
}
```

## How It Works

### Data Flow

1. **Respondent Completes Assessment**
   - Fills out survey form
   - Submits responses

2. **System Calculates Score**
   - Adds up point values
   - Determines score range/category

3. **GHL Sync Triggered**
   - Checks for active GHL integration
   - Retrieves field mappings
   - Retrieves tag rules
   - Retrieves workflow triggers

4. **Contact Created/Updated**
   - Searches for existing contact by email
   - Creates new contact if not found
   - Updates existing contact if found

5. **Data Mapped**
   - Applies field mappings
   - Transforms values as configured
   - Sets custom field values

6. **Tags Applied**
   - Applies completion tags
   - Applies score-range-specific tags

7. **Workflows Triggered**
   - Adds contact to configured workflows
   - Triggers automation sequences

8. **Note Added**
   - Creates detailed note with:
     - Assessment title
     - Score and category
     - All questions and answers
     - Completion timestamp

9. **Sync Logged**
   - Records sync status
   - Stores GHL contact ID
   - Logs any errors for retry

### Sync Log

Every sync is logged for audit and retry:

```sql
SELECT * FROM ghl_sync_log
WHERE response_id = 'response-uuid';
```

Fields:
- `sync_type`: create, update, tag, workflow
- `sync_status`: pending, success, failed, retrying
- `ghl_contact_id`: GHL contact ID
- `error_message`: If failed
- `retry_count`: Number of retries

### Retry Logic

Failed syncs are automatically retried:
- Maximum 5 retry attempts
- Exponential backoff
- Status changes: pending → retrying → success/failed

## Troubleshooting

### Common Issues

**Issue: Integration Not Syncing**

Possible causes:
- Integration not active
- Sync disabled
- Invalid API key
- GHL API down

Solution:
1. Check integration status
2. Verify API key is valid
3. Test connection
4. Check sync logs for errors

**Issue: Fields Not Mapping**

Possible causes:
- Custom field doesn't exist in GHL
- Field type mismatch
- Incorrect field key

Solution:
1. Get GHL custom fields: `GET /api/ghl-integrations/{id}/custom-fields`
2. Verify field key matches exactly
3. Check field type compatibility
4. Create custom field in GHL if needed

**Issue: Workflows Not Triggering**

Possible causes:
- Invalid workflow ID
- Workflow not active in GHL
- Contact already in workflow

Solution:
1. Verify workflow ID in GHL
2. Ensure workflow is active
3. Check GHL workflow settings
4. Review sync logs

**Issue: Duplicate Contacts**

Possible causes:
- Email mismatch (case sensitive)
- Multiple GHL locations

Solution:
- GHL matches by email (case-insensitive)
- System checks for existing contact first
- If duplicates occur, merge in GHL manually

### Checking Sync Status

**View Recent Syncs:**
```http
GET /api/ghl-integrations/{id}/sync-logs
```

**Check Specific Response:**
```sql
SELECT * FROM ghl_sync_log
WHERE response_id = 'uuid'
ORDER BY created_at DESC;
```

### Testing

**Test API Connection:**
```bash
curl -X POST \
  https://your-app.com/api/ghl-integrations/{id}/test \
  -H "Authorization: Bearer YOUR_JWT"
```

**Test Field Mapping:**
1. Complete a test assessment
2. Check GHL contact
3. Verify custom fields populated
4. Check note added to contact

**Test Workflow Trigger:**
1. Complete assessment in score range
2. Check GHL contact
3. Verify contact added to workflow
4. Check workflow activity

## Best Practices

### Field Naming

- Use descriptive field names
- Prefix with category: `assessment_`, `quiz_`, `survey_`
- Use snake_case: `assessment_score` not `AssessmentScore`

### Tag Strategy

- Use consistent naming
- Include assessment name: `Quiz: Marketing - Completed`
- Use score categories: `Score: Beginner`, `Score: Expert`

### Workflow Organization

- Create separate workflows per score range
- Use clear workflow names
- Document trigger conditions
- Test before activating

### Data Privacy

- Only sync necessary fields
- Review GHL data retention policies
- Comply with GDPR/privacy regulations
- Inform respondents of CRM integration

### Performance

- Sync is asynchronous (doesn't slow down response)
- Failed syncs retry automatically
- Monitor sync logs for patterns
- Disable sync for testing assessments

## Security

### API Key Protection

- Never expose API keys in frontend
- Store encrypted in database
- Use environment variables
- Rotate keys regularly

### Access Control

- Only assessment owner can configure GHL
- Field mappings per assessment
- Audit logs for all changes

### Data Transmission

- HTTPS only
- Validated before sending
- Error details not exposed to respondents

## Examples

### Complete Setup Example

```bash
# 1. Create integration
curl -X POST /api/ghl-integrations \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "location_id": "loc_123",
    "api_key": "key_456"
  }'

# 2. Map score field
curl -X POST /api/ghl-integrations/int_789/field-mappings \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "source_field": "score",
    "ghl_field_key": "assessment_score",
    "ghl_field_type": "NUMBER"
  }'

# 3. Add tag rule
curl -X POST /api/ghl-integrations/int_789/tag-rules \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "assessment_id": "assess_abc",
    "tag_name": "Assessment Complete",
    "apply_on": "completion"
  }'

# 4. Add workflow trigger
curl -X POST /api/ghl-integrations/int_789/workflow-triggers \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "assessment_id": "assess_abc",
    "ghl_workflow_id": "workflow_xyz",
    "trigger_type": "all_completions"
  }'
```

## Support

For issues:
1. Check sync logs
2. Review this documentation
3. Test API connection
4. Contact support with sync log ID

---

**Version:** 1.0.0
**Last Updated:** 2024
**GHL API Version:** v1
