/**
 * Database connection module
 * Handles PostgreSQL connection and query execution
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '../utils/logger';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

class Database {
  private pool: Pool;
  private config: DatabaseConfig;

  constructor() {
    // Use environment variables ONLY, no hardcoded values
    this.config = {
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT!),
      database: process.env.DB_NAME!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASSWORD!
    };
    
    // Validate required config
    if (!this.config.host || !this.config.port || !this.config.database || 
        !this.config.user || !this.config.password) {
      logger.error('Database configuration missing', {
        hasHost: !!process.env.DB_HOST,
        hasPort: !!process.env.DB_PORT,
        hasDatabase: !!process.env.DB_NAME,
        hasUser: !!process.env.DB_USER,
        hasPassword: !!process.env.DB_PASSWORD
      });
      throw new Error('Database configuration is incomplete. Check .env file');
    }

    // Debug: log connection config (without password)
    logger.info('Database config', {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      hasPassword: !!this.config.password
    });

    this.pool = new Pool(this.config);
    this.setupEventHandlers();
  }

  /**
   * Setup database event handlers for logging
   */
  private setupEventHandlers(): void {
    this.pool.on('connect', () => {
      logger.info('Database connected successfully');
    });

    this.pool.on('error', (err) => {
      logger.error('Database connection error', { error: err.message });
    });
  }

  /**
   * Execute a database query
   * @param text - SQL query string
   * @param params - Query parameters
   * @returns Promise with query result
   */
  async query(text: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Database query executed', { 
        query: text, 
        duration: `${duration}ms`,
        rows: result.rowCount 
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Database query failed', { 
        query: text, 
        duration: `${duration}ms`,
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Get a client from the connection pool
   * @returns Promise with database client
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    logger.info('Closing database connections');
    await this.pool.end();
  }

  /**
   * Test database connection
   * @returns Promise<boolean> - true if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      logger.info('Database connection test successful', { 
        timestamp: result.rows[0].current_time 
      });
      return true;
    } catch (error) {
      logger.error('Database connection test failed', { 
        error: (error as Error).message 
      });
      return false;
    }
  }
}

// Export singleton instance
export const database = new Database();

