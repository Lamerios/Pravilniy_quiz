/**
 * Template model with validation
 * Handles game template data types and validation logic
 */

import { GameTemplate, TemplateRound, CreateGameTemplateRequest, CreateTemplateRoundRequest } from '../types/shared';

/**
 * Validates game template creation request
 * @param data - Template creation data
 * @returns Validation result with errors if any
 */
export function validateCreateTemplate(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate template name
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Template name is required and must be a string');
  } else if (data.name.trim().length < 3) {
    errors.push('Template name must be at least 3 characters long');
  } else if (data.name.trim().length > 100) {
    errors.push('Template name must not exceed 100 characters');
  }

  // Validate description (optional)
  if (data.description && typeof data.description !== 'string') {
    errors.push('Template description must be a string');
  } else if (data.description && data.description.length > 1000) {
    errors.push('Template description must not exceed 1000 characters');
  }

  // Validate rounds
  if (!data.rounds || !Array.isArray(data.rounds)) {
    errors.push('Template must have at least one round');
  } else if (data.rounds.length === 0) {
    errors.push('Template must have at least one round');
  } else if (data.rounds.length > 20) {
    errors.push('Template cannot have more than 20 rounds');
  } else {
    // Validate each round
    data.rounds.forEach((round: any, index: number) => {
      const roundErrors = validateTemplateRound(round, index + 1);
      errors.push(...roundErrors);
    });

    // Check for duplicate round numbers
    const roundNumbers = data.rounds.map((r: any) => r.round_number);
    const uniqueRoundNumbers = new Set(roundNumbers);
    if (roundNumbers.length !== uniqueRoundNumbers.size) {
      errors.push('Round numbers must be unique');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates template round data
 * @param round - Round data to validate
 * @param roundIndex - Round index for error messages
 * @returns Array of validation errors
 */
function validateTemplateRound(round: any, roundIndex: number): string[] {
  const errors: string[] = [];
  const prefix = `Round ${roundIndex}:`;

  // Validate round number
  if (!round.round_number || typeof round.round_number !== 'number') {
    errors.push(`${prefix} round number is required and must be a number`);
  } else if (round.round_number < 1) {
    errors.push(`${prefix} round number must be positive`);
  } else if (!Number.isInteger(round.round_number)) {
    errors.push(`${prefix} round number must be an integer`);
  }

  // Validate round name
  if (!round.name || typeof round.name !== 'string') {
    errors.push(`${prefix} name is required and must be a string`);
  } else if (round.name.trim().length < 2) {
    errors.push(`${prefix} name must be at least 2 characters long`);
  } else if (round.name.trim().length > 100) {
    errors.push(`${prefix} name must not exceed 100 characters`);
  }

  // Validate max score
  if (!round.max_score || typeof round.max_score !== 'number') {
    errors.push(`${prefix} max score is required and must be a number`);
  } else if (round.max_score < 1) {
    errors.push(`${prefix} max score must be positive`);
  } else if (round.max_score > 1000) {
    errors.push(`${prefix} max score cannot exceed 1000`);
  } else if (!Number.isInteger(round.max_score)) {
    errors.push(`${prefix} max score must be an integer`);
  }

  return errors;
}

/**
 * Validates template update request
 * @param data - Template update data
 * @returns Validation result with errors if any
 */
export function validateUpdateTemplate(data: any): { isValid: boolean; errors: string[] } {
  // For updates, we use the same validation as create but make fields optional
  const errors: string[] = [];

  // If name is provided, validate it
  if (data.name !== undefined) {
    if (typeof data.name !== 'string') {
      errors.push('Template name must be a string');
    } else if (data.name.trim().length < 3) {
      errors.push('Template name must be at least 3 characters long');
    } else if (data.name.trim().length > 100) {
      errors.push('Template name must not exceed 100 characters');
    }
  }

  // If description is provided, validate it
  if (data.description !== undefined) {
    if (data.description !== null && typeof data.description !== 'string') {
      errors.push('Template description must be a string or null');
    } else if (data.description && data.description.length > 1000) {
      errors.push('Template description must not exceed 1000 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes template data for database storage
 * @param data - Raw template data
 * @returns Sanitized template data
 */
export function sanitizeTemplateData(data: CreateGameTemplateRequest): CreateGameTemplateRequest {
  return {
    name: data.name.trim(),
    description: data.description?.trim() || undefined,
    rounds: data.rounds.map(round => ({
      round_number: round.round_number,
      name: round.name.trim(),
      max_score: round.max_score
    }))
  };
}

