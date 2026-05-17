/**
 * Prisma Client Wrapper
 * 
 * Singleton Prisma client instance with connection management.
 * Handles database connections, transactions, and cleanup.
 */

import { PrismaClient } from '@prisma/client';

class PrismaService {
  constructor() {
    this.prisma = null;
    this.isConnected = false;
  }

  /**
   * Get Prisma client instance (singleton)
   * @returns {PrismaClient} - Prisma client
   */
  getClient() {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
        errorFormat: 'pretty',
      });

      // Setup graceful shutdown handlers
      process.on('SIGTERM', async () => {
        console.log('Prisma client disconnecting...');
        await this.disconnect();
      });

      process.on('SIGINT', async () => {
        console.log('Prisma client disconnecting...');
        await this.disconnect();
      });
    }

    return this.prisma;
  }

  /**
   * Connect to database
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      const client = this.getClient();
      await client.$connect();
      this.isConnected = true;
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.prisma || !this.isConnected) {
      return;
    }

    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      console.log('Database disconnected');
    } catch (error) {
      console.error('Database disconnect failed:', error);
      throw error;
    }
  }

  /**
   * Execute in transaction
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>} - Transaction result
   */
  async transaction(callback) {
    const client = this.getClient();
    return client.$transaction(callback);
  }

  /**
   * Execute raw query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<any>} - Query result
   */
  async executeRaw(query, params = []) {
    const client = this.getClient();
    return client.$executeRaw`${query}`;
  }

  /**
   * Query raw
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<any>} - Query result
   */
  async queryRaw(query, params = []) {
    const client = this.getClient();
    return client.$queryRaw`${query}`;
  }

  /**
   * Health check
   * @returns {Promise<boolean>} - Health status
   */
  async healthCheck() {
    try {
      const client = this.getClient();
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get connection status
   * @returns {boolean} - Connection status
   */
  isHealthy() {
    return this.isConnected;
  }
}

// Export singleton instance
const prismaService = new PrismaService();

export default prismaService;
export { PrismaClient };

// Made with Bob
