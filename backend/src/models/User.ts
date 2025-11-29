import pool from '../config/database';
import { User } from '../types';

export type UserRole = 'super_admin' | 'assistant_admin' | 'client' | 'respondent';

export class UserModel {
  static async create(
    email: string,
    passwordHash: string,
    name: string,
    companyName?: string,
    role: UserRole = 'client',
    createdBy?: string
  ): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, name, company_name, role, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(query, [email, passwordHash, name, companyName, role, createdBy]);
    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async update(id: string, updates: Partial<User>): Promise<User | null> {
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (fields.length === 0) return null;

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`;

    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async updateSubscription(
    id: string,
    tier: string,
    status: string
  ): Promise<User | null> {
    const query = `
      UPDATE users
      SET subscription_tier = $2, subscription_status = $3
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id, tier, status]);
    return result.rows[0] || null;
  }

  static async updateRole(id: string, role: UserRole): Promise<User | null> {
    const query = `
      UPDATE users
      SET role = $2
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id, role]);
    return result.rows[0] || null;
  }

  static async findByRole(role: UserRole): Promise<User[]> {
    const query = 'SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [role]);
    return result.rows;
  }

  static async findAll(limit: number = 100, offset: number = 0): Promise<User[]> {
    const query = `
      SELECT id, email, name, company_name, role, subscription_tier, subscription_status, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  static async countByRole(): Promise<Record<UserRole, number>> {
    const query = `
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
    `;
    const result = await pool.query(query);

    const counts: Record<string, number> = {
      super_admin: 0,
      assistant_admin: 0,
      client: 0,
      respondent: 0,
    };

    result.rows.forEach(row => {
      counts[row.role] = parseInt(row.count, 10);
    });

    return counts as Record<UserRole, number>;
  }

  static async isSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    return user?.role === 'super_admin';
  }

  static async isAdmin(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    return user?.role === 'super_admin' || user?.role === 'assistant_admin';
  }
}
