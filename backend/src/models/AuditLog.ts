import pool from '../config/database';

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface CreateAuditLogInput {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export class AuditLogModel {
  static async create(data: CreateAuditLogInput): Promise<AuditLog> {
    const query = `
      INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      data.user_id,
      data.action,
      data.entity_type,
      data.entity_id,
      data.old_values ? JSON.stringify(data.old_values) : null,
      data.new_values ? JSON.stringify(data.new_values) : null,
      data.ip_address,
      data.user_agent,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(userId: string, limit: number = 50): Promise<AuditLog[]> {
    const query = `
      SELECT * FROM audit_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  static async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const query = `
      SELECT * FROM audit_logs
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [entityType, entityId]);
    return result.rows;
  }

  static async findAll(limit: number = 100, offset: number = 0): Promise<AuditLog[]> {
    const query = `
      SELECT al.*, u.email as user_email, u.name as user_name
      FROM audit_logs al
      JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  static async count(): Promise<number> {
    const query = 'SELECT COUNT(*) FROM audit_logs';
    const result = await pool.query(query);
    return parseInt(result.rows[0].count, 10);
  }
}
