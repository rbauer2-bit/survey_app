import pool from '../config/database';
import { User } from '../types';

export class UserModel {
  static async create(email: string, passwordHash: string, name: string, companyName?: string): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, name, company_name)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [email, passwordHash, name, companyName]);
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
}
