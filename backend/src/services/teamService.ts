/**
 * Team service
 * Business logic for team management
 */

import { database } from '../db/database';
import { Team, CreateTeamRequest, UpdateTeamRequest } from '../types/shared';
import { logger } from '../utils/logger';

export class TeamService {
  
  /**
   * Get all teams
   */
  async getAllTeams(): Promise<Team[]> {
    try {
      const result = await database.query(
        `SELECT 
          t.*,
          COALESCE(COUNT(DISTINCT gp.game_id), 0)::int AS games_count
        FROM teams t
        LEFT JOIN game_participants gp ON gp.team_id = t.id
        GROUP BY t.id
        ORDER BY games_count DESC, t.created_at DESC`
      );
      
      logger.info('Retrieved teams list', { count: result.rows.length });
      return result.rows;
    } catch (error) {
      logger.error('Failed to get teams', { error: (error as Error).message });
      throw new Error('Failed to retrieve teams');
    }
  }

  /**
   * Get team by ID
   */
  async getTeamById(id: number): Promise<Team | null> {
    try {
      const result = await database.query(
        'SELECT * FROM teams WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        logger.info('Team not found', { teamId: id });
        return null;
      }
      
      logger.info('Retrieved team', { teamId: id, teamName: result.rows[0].name });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get team by ID', { 
        teamId: id, 
        error: (error as Error).message 
      });
      throw new Error('Failed to retrieve team');
    }
  }

  /**
   * Create new team
   */
  async createTeam(teamData: CreateTeamRequest): Promise<Team> {
    try {
      const result = await database.query(
        'INSERT INTO teams (name) VALUES ($1) RETURNING *',
        [teamData.name]
      );
      
      const newTeam = result.rows[0];
      logger.info('Team created', { teamId: newTeam.id, teamName: newTeam.name });
      return newTeam;
    } catch (error) {
      if ((error as any).code === '23505') { // Unique constraint violation
        logger.warn('Attempt to create duplicate team', { teamName: teamData.name });
        throw new Error('Team with this name already exists');
      }
      
      logger.error('Failed to create team', { 
        teamName: teamData.name, 
        error: (error as Error).message 
      });
      throw new Error('Failed to create team');
    }
  }

  /**
   * Update team
   */
  async updateTeam(id: number, teamData: UpdateTeamRequest): Promise<Team | null> {
    try {
      // Check if team exists
      const existingTeam = await this.getTeamById(id);
      if (!existingTeam) {
        return null;
      }

      const result = await database.query(
        'UPDATE teams SET name = COALESCE($1, name) WHERE id = $2 RETURNING *',
        [teamData.name, id]
      );
      
      const updatedTeam = result.rows[0];
      logger.info('Team updated', { 
        teamId: id, 
        oldName: existingTeam.name,
        newName: updatedTeam.name 
      });
      return updatedTeam;
    } catch (error) {
      if ((error as any).code === '23505') { // Unique constraint violation
        logger.warn('Attempt to update team with duplicate name', { 
          teamId: id, 
          teamName: teamData.name 
        });
        throw new Error('Team with this name already exists');
      }
      
      logger.error('Failed to update team', { 
        teamId: id, 
        error: (error as Error).message 
      });
      throw new Error('Failed to update team');
    }
  }

  /**
   * Update team logo path
   */
  async updateTeamLogo(id: number, logoPath: string): Promise<Team | null> {
    try {
      const result = await database.query(
        'UPDATE teams SET logo_path = $1 WHERE id = $2 RETURNING *',
        [logoPath, id]
      );
      
      if (result.rows.length === 0) {
        logger.info('Team not found for logo update', { teamId: id });
        return null;
      }
      
      const updatedTeam = result.rows[0];
      logger.info('Team logo updated', { teamId: id, logoPath });
      return updatedTeam;
    } catch (error) {
      logger.error('Failed to update team logo', { 
        teamId: id, 
        logoPath,
        error: (error as Error).message 
      });
      throw new Error('Failed to update team logo');
    }
  }

  /**
   * Delete team
   */
  async deleteTeam(id: number): Promise<boolean> {
    try {
      // Soft cascade: remove team from games and scores, then delete team
      await database.query('DELETE FROM round_scores WHERE team_id = $1', [id]);
      await database.query('DELETE FROM game_participants WHERE team_id = $1', [id]);

      const result = await database.query(
        'DELETE FROM teams WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        logger.info('Team not found for deletion', { teamId: id });
        return false;
      }
      
      logger.info('Team deleted', { 
        teamId: id, 
        teamName: result.rows[0].name 
      });
      return true;
    } catch (error) {
      logger.error('Failed to delete team', { 
        teamId: id, 
        error: (error as Error).message 
      });
      throw error;
    }
  }
}

export const teamService = new TeamService();
