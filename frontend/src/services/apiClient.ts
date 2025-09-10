/**
 * API client for backend communication
 * Handles HTTP requests to the backend API
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, GameTemplate, CreateGameTemplateRequest } from '../../../shared/types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all game templates
   * @returns Promise with templates array
   */
  async getTemplates(): Promise<GameTemplate[]> {
    try {
      const response: AxiosResponse<ApiResponse<GameTemplate[]>> = await this.client.get('/api/templates');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      throw new Error('Не удалось загрузить шаблоны игр');
    }
  }

  /**
   * Get template by ID
   * @param id - Template ID
   * @returns Promise with template data
   */
  async getTemplate(id: number): Promise<GameTemplate> {
    try {
      const response: AxiosResponse<ApiResponse<GameTemplate>> = await this.client.get(`/api/templates/${id}`);
      if (!response.data.data) {
        throw new Error('Шаблон не найден');
      }
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch template:', error);
      throw new Error('Не удалось загрузить шаблон игры');
    }
  }

  /**
   * Create new template
   * @param templateData - Template creation data
   * @returns Promise with created template
   */
  async createTemplate(templateData: CreateGameTemplateRequest): Promise<GameTemplate> {
    try {
      const response: AxiosResponse<ApiResponse<GameTemplate>> = await this.client.post('/api/templates', templateData);
      if (!response.data.data) {
        throw new Error('Не удалось создать шаблон');
      }
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to create template:', error);
      const message = error.response?.data?.error || 'Не удалось создать шаблон игры';
      throw new Error(message);
    }
  }

  /**
   * Update template
   * @param id - Template ID
   * @param updateData - Update data
   * @returns Promise with updated template
   */
  async updateTemplate(id: number, updateData: Partial<GameTemplate>): Promise<GameTemplate> {
    try {
      const response: AxiosResponse<ApiResponse<GameTemplate>> = await this.client.put(`/api/templates/${id}`, updateData);
      if (!response.data.data) {
        throw new Error('Не удалось обновить шаблон');
      }
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to update template:', error);
      const message = error.response?.data?.error || 'Не удалось обновить шаблон игры';
      throw new Error(message);
    }
  }

  /**
   * Delete template
   * @param id - Template ID
   * @returns Promise<void>
   */
  async deleteTemplate(id: number): Promise<void> {
    try {
      await this.client.delete(`/api/templates/${id}`);
    } catch (error: any) {
      console.error('Failed to delete template:', error);
      const message = error.response?.data?.error || 'Не удалось удалить шаблон игры';
      throw new Error(message);
    }
  }

  /**
   * Check API health
   * @returns Promise<boolean>
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

