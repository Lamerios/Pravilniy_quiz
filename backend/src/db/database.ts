/**
 * Database connection module
 * Handles PostgreSQL connection and query execution
 */

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
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'quiz_game',
      user: process.env.DB_USER || 'quiz_user',
      password: process.env.DB_PASSWORD || 'quiz_password'
    };

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

