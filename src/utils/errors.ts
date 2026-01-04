/**
 * ERPNext Error Handling Utilities
 * 
 * Extracts detailed error messages from ERPNext API responses.
 * ERPNext returns errors in various formats - this module handles all of them.
 */

import { AxiosError } from 'axios';

interface ERPNextErrorResponse {
  _server_messages?: string;
  message?: string;
  exception?: string;
  exc_type?: string;
  exc?: string;
  _error_message?: string;
}

/**
 * Extract detailed error message from ERPNext API response
 */
export function extractERPNextError(error: AxiosError<ERPNextErrorResponse>): string {
  if (error.response?.data) {
    const data = error.response.data;
    
    // Try _server_messages first (most detailed, JSON-encoded array)
    if (data._server_messages) {
      try {
        const messages = JSON.parse(data._server_messages) as string[];
        const parsed = messages.map((m: string) => {
          try {
            const obj = JSON.parse(m) as { message?: string; msg?: string };
            return obj.message || obj.msg || m;
          } catch {
            return m;
          }
        }).filter((m: string) => m && m.trim());
        
        if (parsed.length > 0) {
          return parsed.join('; ');
        }
      } catch {
        // Fall through to other methods
      }
    }
    
    // Simple message field
    if (data.message && typeof data.message === 'string') {
      return data.message;
    }
    
    // Exception field with pattern matching
    if (data.exception) {
      const exception = data.exception;
      const match = exception.match(
        /(?:ValidationError|MandatoryError|LinkValidationError|DuplicateEntryError|TimestampMismatchError):\s*(.+?)(?:\n|$)/
      );
      if (match) {
        return match[0].trim();
      }
      return exception.split('\n')[0];
    }
    
    // Exception type with message
    if (data.exc_type) {
      const msg = data.message || data.exc || 'Unknown error';
      return `${data.exc_type}: ${msg}`;
    }

    // Legacy error message field
    if (data._error_message) {
      return data._error_message;
    }
  }
  
  // HTTP status code messages
  if (error.response?.status) {
    const status = error.response.status;
    const statusMessages: Record<number, string> = {
      400: 'Bad Request - Invalid data sent to ERPNext',
      401: 'Unauthorized - Check your API key and secret',
      403: 'Forbidden - You do not have permission for this operation',
      404: 'Not Found - The requested resource does not exist',
      409: 'Conflict - Document may have been modified by another user',
      417: 'Expectation Failed - Validation error in ERPNext',
      500: 'Internal Server Error - ERPNext encountered an error',
      502: 'Bad Gateway - ERPNext server is not responding',
      503: 'Service Unavailable - ERPNext is temporarily unavailable'
    };
    
    if (statusMessages[status]) {
      return `HTTP ${status}: ${statusMessages[status]}`;
    }
  }
  
  // Fallback to error message
  if (error.message) {
    return error.message;
  }
  
  return 'Unknown error occurred';
}

/**
 * Format error response for tool output
 */
export function formatErrorResponse(operation: string, error: AxiosError<ERPNextErrorResponse>): string {
  const details = extractERPNextError(error);
  const status = error.response?.status ? ` (HTTP ${error.response.status})` : '';
  return `${operation}${status}: ${details}`;
}

/**
 * Debug logging utility
 */
const DEBUG = process.env.ERPNEXT_DEBUG === 'true';

export function debugLog(message: string, data?: unknown): void {
  if (DEBUG) {
    console.error(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}
