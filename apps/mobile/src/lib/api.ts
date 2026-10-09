import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AuthTokens, ApiError, ApiResponse } from '@/types/api';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<AuthTokens> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const accessToken = await SecureStore.getItemAsync('access_token');
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        const csrfToken = await SecureStore.getItemAsync('csrf_token');
        if (csrfToken && config.headers && ['post', 'put', 'patch', 'delete'].includes(config.method || '')) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const tokens = await this.refreshTokens();
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            await this.clearAuth();
            router.replace('/(auth)/login');
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshTokens(): Promise<AuthTokens> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post<ApiResponse<AuthTokens>>(
        `${API_BASE_URL}/admin/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const tokens = response.data.data;
      await this.storeTokens(tokens);
      return tokens;
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  async storeTokens(tokens: AuthTokens) {
    await Promise.all([
      SecureStore.setItemAsync('access_token', tokens.accessToken),
      SecureStore.setItemAsync('refresh_token', tokens.refreshToken),
      SecureStore.setItemAsync('csrf_token', tokens.csrfToken),
    ]);
  }

  async clearAuth() {
    await Promise.all([
      SecureStore.deleteItemAsync('access_token'),
      SecureStore.deleteItemAsync('refresh_token'),
      SecureStore.deleteItemAsync('csrf_token'),
      SecureStore.deleteItemAsync('user_data'),
      SecureStore.deleteItemAsync('tenant_id'),
    ]);
  }

  async get<T>(url: string, params?: Record<string, any>) {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    return response.data.data;
  }

  async post<T>(url: string, data?: any) {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return response.data.data;
  }

  async put<T>(url: string, data?: any) {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data.data;
  }

  async patch<T>(url: string, data?: any) {
    const response = await this.client.patch<ApiResponse<T>>(url, data);
    return response.data.data;
  }

  async delete<T>(url: string) {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return response.data.data;
  }

  // File upload
  async uploadFile<T>(url: string, file: { uri: string; name: string; type: string }, onProgress?: (progress: number) => void) {
    const formData = new FormData();
    formData.append('file', file as any);

    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      },
    });
    return response.data.data;
  }

  // Download file
  async downloadFile(url: string, onProgress?: (progress: number) => void) {
    const response = await this.client.get(url, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      },
    });
    return response.data;
  }
}

export const api = new ApiClient();

// Auth API
export const authApi = {
  login: (data: { email: string; password: string; tenantId?: string }) =>
    api.post<AuthTokens & { user: any; permissions: string[] }>('/admin/auth/login', data),

  register: (data: { email: string; password: string; fullName: string; tenantId: string }) =>
    api.post<AuthTokens & { user: any; permissions: string[] }>('/admin/auth/register', data),

  logout: (refreshToken?: string) =>
    api.post('/admin/auth/logout', { refreshToken }),

  refresh: (refreshToken: string) =>
    api.post<AuthTokens>('/admin/auth/refresh', { refreshToken }),

  me: () =>
    api.get<{ user: any; permissions: string[] }>('/admin/auth/me'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/admin/auth/change-password', data),

  // SSO
  ssoLogin: (tenantId: string) =>
    api.get<{ url: string }>(`/admin/auth/sso/${tenantId}/login`),

  ssoStatus: (tenantId: string) =>
    api.get<{ enabled: boolean }>(`/admin/auth/sso/${tenantId}/status`),
};

// Attendance API
export const attendanceApi = {
  checkIn: (data: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
    photo?: string;
    method: 'FACE' | 'GPS' | 'MANUAL';
    shiftId?: string;
  }) => api.post<{ record: any }>('/attendance/check-in', data),

  checkOut: (data: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
    photo?: string;
    method: 'FACE' | 'GPS' | 'MANUAL';
  }) => api.post<{ record: any }>('/attendance/check-out', data),

  getTodayRecord: () =>
    api.get<{ record: any }>('/attendance/today'),

  getRecords: (params?: { startDate?: string; endDate?: string; page?: number; limit?: number }) =>
    api.get<{ data: any[]; meta: any }>('/attendance/records', params),

  getCorrections: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: any[]; meta: any }>('/attendance/corrections', params),

  createCorrection: (data: {
    date: string;
    checkInTime?: string;
    checkOutTime?: string;
    reason: string;
    attachment?: string;
  }) => api.post('/attendance/corrections', data),

  // Shifts
  getShifts: () =>
    api.get<any[]>('/attendance/shifts'),

  getRosters: (params?: { startDate?: string; endDate?: string }) =>
    api.get<any[]>('/attendance/rosters', params),

  getMyRoster: (params?: { startDate?: string; endDate?: string }) =>
    api.get<any[]>('/attendance/rosters/my', params),

  // Leave
  getLeaveTypes: () =>
    api.get<any[]>('/attendance/leave-types'),

  getLeaveBalances: (year?: number) =>
    api.get<any[]>('/attendance/leave-balances', { year }),

  getLeaveRequests: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ data: any[]; meta: any }>('/attendance/leave-requests', params),

  createLeaveRequest: (data: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    attachment?: string;
  }) => api.post('/attendance/leave-requests', data),

  cancelLeaveRequest: (id: string) =>
    api.post(`/attendance/leave-requests/${id}/cancel`),

  // Overtime
  getOvertimeRequests: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ data: any[]; meta: any }>('/attendance/overtime-requests', params),

  createOvertimeRequest: (data: {
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
  }) => api.post('/attendance/overtime-requests', data),

  // Biometric
  enrollFace: (data: { embedding: number[]; quality: number }) =>
    api.post('/attendance/biometric/enroll', data),

  verifyFace: (data: { embedding: number[] }) =>
    api.post('/attendance/biometric/verify', data),

  getBiometricStatus: () =>
    api.get<{ enrolled: boolean; enrolledAt?: string }>('/attendance/biometric/status'),
};

// Employee API
export const employeeApi = {
  getProfile: () =>
    api.get<any>('/employees/me'),

  updateProfile: (data: Partial<any>) =>
    api.patch('/employees/me', data),

  uploadAvatar: (file: { uri: string; name: string; type: string }) =>
    api.uploadFile('/employees/me/avatar', file),

  getColleagues: (params?: { departmentId?: string; organizationId?: string; search?: string; page?: number; limit?: number }) =>
    api.get<{ data: any[]; meta: any }>('/employees', params),

  getEmployee: (id: string) =>
    api.get<any>(`/employees/${id}`),

  // Documents
  getDocuments: (params?: { categoryId?: string; page?: number; limit?: number }) =>
    api.get<{ data: any[]; meta: any }>('/employees/me/documents', params),

  uploadDocument: (data: {
    categoryId: string;
    title: string;
    description?: string;
    file: { uri: string; name: string; type: string };
  }) => api.uploadFile('/employees/me/documents', data.file),

  // Payroll
  getPayslips: (params?: { year?: number; page?: number; limit?: number }) =>
    api.get<{ data: any[]; meta: any }>('/employees/me/payslips', params),

  downloadPayslip: (id: string) =>
    api.downloadFile(`/employees/me/payslips/${id}/download`),

  // Leave balances
  getMyLeaveBalances: (year?: number) =>
    api.get<any[]>('/employees/me/leave-balances', { year }),
};

// Admin API (for admin users)
export const adminApi = {
  // Users
  getUsers: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get<{ data: any[]; meta: any }>('/admin/users', params),

  createUser: (data: { email: string; password: string; fullName: string; tenantId: string }) =>
    api.post('/admin/users', data),

  updateUser: (id: string, data: Partial<any>) =>
    api.patch(`/admin/users/${id}`, data),

  deleteUser: (id: string) =>
    api.delete(`/admin/users/${id}`),

  assignRole: (userId: string, roleId: string, scope?: string) =>
    api.post(`/admin/users/${userId}/roles`, { roleId, scope }),

  // Roles & Permissions
  getRoles: () =>
    api.get<any[]>('/admin/roles'),

  createRole: (data: { name: string; description?: string; tenantId: string }) =>
    api.post('/admin/roles', data),

  getPermissions: () =>
    api.get<any[]>('/admin/permissions'),

  // Tenants
  getTenants: () =>
    api.get<any[]>('/admin/tenants'),

  createTenant: (data: { name: string; domain: string; package: string }) =>
    api.post('/admin/tenants', data),

  // SSO
  getSsoConnection: (tenantId: string) =>
    api.get<any>(`/admin/auth/admin/sso/${tenantId}`),

  createSsoConnection: (tenantId: string, data: any) =>
    api.post(`/admin/auth/admin/sso/${tenantId}`, data),

  updateSsoConnection: (tenantId: string, data: any) =>
    api.patch(`/admin/auth/admin/sso/${tenantId}`, data),

  deleteSsoConnection: (tenantId: string) =>
    api.delete(`/admin/auth/admin/sso/${tenantId}`),

  // Payroll
  getPayrollPeriods: () =>
    api.get<any[]>('/admin/payroll/periods'),

  createPayrollPeriod: (data: any) =>
    api.post('/admin/payroll/periods', data),

  getPayrollRuns: (periodId: string, params?: { page?: number; limit?: number }) =>
    api.get<{ data: any[]; meta: any }>(`/admin/payroll/periods/${periodId}/runs`, params),

  calculatePayrollRun: (periodId: string, employeeId: string) =>
    api.post(`/admin/payroll/periods/${periodId}/runs/${employeeId}/calculate`),

  approvePayrollRun: (periodId: string, employeeId: string) =>
    api.post(`/admin/payroll/periods/${periodId}/runs/${employeeId}/approve`),

  generatePayslips: (periodId: string) =>
    api.post(`/admin/payroll/periods/${periodId}/generate-payslips`),

  // BPJS
  getBpjsConfig: (type: 'KESEHATAN' | 'KETENAGAKERJAAN') =>
    api.get<any>(`/admin/payroll/bpjs-config/${type}`),

  updateBpjsConfig: (type: 'KESEHATAN' | 'KETENAGAKERJAAN', data: any) =>
    api.patch(`/admin/payroll/bpjs-config/${type}`, data),

  // Tax
  getTaxConfig: (year: number) =>
    api.get<any>(`/admin/payroll/tax-config/${year}`),

  updateTaxConfig: (year: number, data: any) =>
    api.patch(`/admin/payroll/tax-config/${year}`, data),

  // Announcements
  getAnnouncements: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: any[]; meta: any }>('/admin/announcements', params),

  createAnnouncement: (data: any) =>
    api.post('/admin/announcements', data),

  // Notifications
  sendNotification: (data: { userIds: string[]; title: string; message: string; type: string }) =>
    api.post('/admin/notifications/send', data),
};