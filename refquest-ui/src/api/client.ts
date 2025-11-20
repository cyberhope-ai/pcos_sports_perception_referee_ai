/**
 * Phase 5A: API Client
 *
 * Axios-based HTTP client for RefQuest AI backend API
 */
import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { ErrorResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ErrorResponse>) => {
        if (error.response) {
          // Server responded with error status
          console.error('API Error:', error.response.data);
          throw new Error(error.response.data.error || 'API request failed');
        } else if (error.request) {
          // Request made but no response
          console.error('Network Error:', error.request);
          throw new Error('Network error - no response from server');
        } else {
          // Request setup error
          console.error('Request Error:', error.message);
          throw error;
        }
      }
    );
  }

  async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }
}

export const apiClient = new ApiClient();
