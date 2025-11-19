/**
 * API client for backend communication
 * Handles HTTP requests to the backend API
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  ApiResponse, 
  GameTemplate, 
  CreateGameTemplateRequest, 
  Team, 
  CreateTeamRequest, 
  UpdateTeamRequest,
  Game,
  CreateGameRequest,
  GameStatus,
  RoundScore,
  UpdateScoreRequest
} from '../../../shared/types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    const baseUrl = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
        if (token) {
          config.headers = config.headers || {};
          (config.headers as any)['Authorization'] = `Bearer ${token}`;
        }
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
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          try {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('admin_token');
              if (window.location.pathname.startsWith('/admin')) {
                window.location.replace('/admin');
              }
            }
          } catch {}
        }
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // ===================== Auth API =====================
  async adminLogin(password: string): Promise<string> {
    const resp: AxiosResponse<ApiResponse<{ token: string }>> = await this.client.post('/api/auth/login', { password });
    const token = resp.data.data?.token;
    if (!token) throw new Error('Не удалось получить токен');
    if (typeof window !== 'undefined') localStorage.setItem('admin_token', token);
    return token;
  }

  adminLogout(): void {
    if (typeof window !== 'undefined') localStorage.removeItem('admin_token');
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

  // ===================== Teams API =====================

  async getTeams(): Promise<Team[]> {
    try {
      const response: AxiosResponse<ApiResponse<Team[]>> = await this.client.get('/api/teams');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      throw new Error('Не удалось загрузить команды');
    }
  }

  async createTeam(payload: CreateTeamRequest): Promise<Team> {
    try {
      const response: AxiosResponse<ApiResponse<Team>> = await this.client.post('/api/teams', payload);
      if (!response.data.data) throw new Error('Не удалось создать команду');
      return response.data.data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Не удалось создать команду';
      throw new Error(message);
    }
  }

  async updateTeam(id: number, payload: UpdateTeamRequest): Promise<Team> {
    try {
      const response: AxiosResponse<ApiResponse<Team>> = await this.client.put(`/api/teams/${id}`, payload);
      if (!response.data.data) throw new Error('Не удалось обновить команду');
      return response.data.data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Не удалось обновить команду';
      throw new Error(message);
    }
  }

  async deleteTeam(id: number): Promise<void> {
    try {
      await this.client.delete(`/api/teams/${id}`);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Не удалось удалить команду';
      throw new Error(message);
    }
  }

  async uploadTeamLogo(id: number, file: File): Promise<Team> {
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response: AxiosResponse<ApiResponse<Team>> = await this.client.post(`/api/teams/${id}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!response.data.data) throw new Error('Не удалось загрузить логотип');
      return response.data.data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Не удалось загрузить логотип';
      throw new Error(message);
    }
  }

  // ===================== Games API =====================

  async getGames(): Promise<Game[]> {
    try {
      const response: AxiosResponse<ApiResponse<Game[]>> = await this.client.get('/api/games');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch games:', error);
      throw new Error('Не удалось загрузить список игр');
    }
  }

  async deleteGame(id: number): Promise<void> {
    await this.client.delete(`/api/games/${id}`);
  }

  async getGame(id: number): Promise<Game> {
    try {
      const response: AxiosResponse<ApiResponse<Game>> = await this.client.get(`/api/games/${id}`);
      if (!response.data.data) throw new Error('Игра не найдена');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch game:', error);
      throw new Error('Не удалось загрузить игру');
    }
  }

  async createGame(payload: CreateGameRequest): Promise<Game> {
    try {
      const response: AxiosResponse<ApiResponse<Game>> = await this.client.post('/api/games', payload);
      if (!response.data.data) throw new Error('Не удалось создать игру');
      return response.data.data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Не удалось создать игру';
      throw new Error(message);
    }
  }

  async updateParticipants(gameId: number, updates: { team_id: number; table_number: string | null }[]): Promise<any[]> {
    try {
      const response: AxiosResponse<ApiResponse<any[]>> = await this.client.put(`/api/games/${gameId}/participants`, updates);
      return response.data.data || [];
    } catch (error: any) {
      const message = error.response?.data?.error || 'Не удалось обновить участников игры';
      throw new Error(message);
    }
  }

  async updateGameStatus(gameId: number, status: GameStatus): Promise<Game> {
    try {
      const response: AxiosResponse<ApiResponse<Game>> = await this.client.put(`/api/games/${gameId}/status`, { status });
      if (!response.data.data) throw new Error('Не удалось обновить статус игры');
      return response.data.data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Не удалось обновить статус игры';
      throw new Error(message);
    }
  }

  async setGameRound(gameId: number, current_round: number): Promise<Game> {
    try {
      const response: AxiosResponse<ApiResponse<Game>> = await this.client.put(`/api/games/${gameId}/round`, { current_round });
      if (!response.data.data) throw new Error('Не удалось изменить раунд');
      return response.data.data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Не удалось изменить раунд';
      throw new Error(message);
    }
  }

  async upsertScore(gameId: number, payload: UpdateScoreRequest): Promise<RoundScore> {
    try {
      const response: AxiosResponse<ApiResponse<RoundScore>> = await this.client.post(`/api/games/${gameId}/scores`, payload);
      if (!response.data.data) throw new Error('Не удалось сохранить счёт');
      return response.data.data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Не удалось сохранить счёт';
      throw new Error(message);
    }
  }

  async getScores(gameId: number): Promise<RoundScore[]> {
    try {
      const response: AxiosResponse<ApiResponse<RoundScore[]>> = await this.client.get(`/api/games/${gameId}/scores`);
      return response.data.data || [];
    } catch (error: any) {
      const message = error.response?.data?.error || 'Не удалось загрузить результаты';
      throw new Error(message);
    }
  }

  async addParticipant(gameId: number, payload: { team_id: number; table_number?: string | null; participants_count?: number | null }): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.client.post(`/api/games/${gameId}/participants`, payload);
    return response.data.data;
  }

  async removeParticipant(gameId: number, teamId: number): Promise<void> {
    await this.client.delete(`/api/games/${gameId}/participants/${teamId}`);
  }

  // ===================== Public API =====================

  async getPublicLastGame(): Promise<any | null> {
    const res = await this.client.get('/api/public/last-game');
    return res.data.data || null;
  }

  async getPublicStats(season?: number): Promise<any> {
    const res = await this.client.get('/api/public/stats', { params: season ? { season } : undefined });
    return res.data.data;
  }

  async getPublicTeamProfile(teamId: number): Promise<any> {
    const res = await this.client.get(`/api/public/teams/${teamId}`);
    return res.data.data;
  }

  async getPublicRanking(params: { sort?: string; order?: 'asc'|'desc'; page?: number; limit?: number; season?: number }): Promise<any> {
    const res = await this.client.get('/api/public/ranking', { params });
    return res.data.data;
  }

  async getPublicTeams(params: { page?: number; limit?: number }): Promise<any> {
    const res = await this.client.get('/api/public/teams', { params });
    return res.data.data;
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

