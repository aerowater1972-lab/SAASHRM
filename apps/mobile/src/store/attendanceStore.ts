import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AttendanceRecord, LeaveRequest, LeaveBalance, OvertimeRequest, Shift, Roster, LeaveType } from '@/types/api';
import * as SecureStore from 'expo-secure-store';
import { attendanceApi } from '@/lib/api';

interface AttendanceState {
  todayRecord: AttendanceRecord | null;
  records: AttendanceRecord[];
  leaveTypes: LeaveType[];
  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  shifts: Shift[];
  rosters: Roster[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTodayRecord: () => Promise<void>;
  fetchRecords: (params?: { startDate?: string; endDate?: string }) => Promise<void>;
  checkIn: (data: any) => Promise<AttendanceRecord>;
  checkOut: (data: any) => Promise<AttendanceRecord>;
  fetchLeaveTypes: () => Promise<void>;
  fetchLeaveBalances: (year?: number) => Promise<void>;
  fetchLeaveRequests: (params?: { status?: string }) => Promise<void>;
  createLeaveRequest: (data: any) => Promise<LeaveRequest>;
  cancelLeaveRequest: (id: string) => Promise<void>;
  fetchOvertimeRequests: (params?: { status?: string }) => Promise<void>;
  createOvertimeRequest: (data: any) => Promise<OvertimeRequest>;
  fetchShifts: () => Promise<void>;
  fetchRosters: (params?: { startDate?: string; endDate?: string }) => Promise<void>;
  fetchMyRoster: (params?: { startDate?: string; endDate?: string }) => Promise<void>;
  clearError: () => void;
}

const secureStorage = {
  getItem: async (name: string) => {
    const value = await SecureStore.getItemAsync(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string) => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set, get) => ({
      todayRecord: null,
      records: [],
      leaveTypes: [],
      leaveBalances: [],
      leaveRequests: [],
      overtimeRequests: [],
      shifts: [],
      rosters: [],
      isLoading: false,
      error: null,

      fetchTodayRecord: async () => {
        set({ isLoading: true, error: null });
        try {
          const { record } = await attendanceApi.getTodayRecord();
          set({ todayRecord: record, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
        }
      },

      fetchRecords: async (params) => {
        set({ isLoading: true, error: null });
        try {
          const { data, meta } = await attendanceApi.getRecords(params);
          set({ records: data, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
        }
      },

      checkIn: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const { record } = await attendanceApi.checkIn(data);
          set((state) => ({
            todayRecord: record,
            records: [record, ...state.records.filter((r) => r.id !== record.id)],
            isLoading: false,
          }));
          return record;
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      checkOut: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const { record } = await attendanceApi.checkOut(data);
          set((state) => ({
            todayRecord: record,
            records: [record, ...state.records.filter((r) => r.id !== record.id)],
            isLoading: false,
          }));
          return record;
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      fetchLeaveTypes: async () => {
        try {
          const leaveTypes = await attendanceApi.getLeaveTypes();
          set({ leaveTypes });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      fetchLeaveBalances: async (year) => {
        try {
          const leaveBalances = await attendanceApi.getLeaveBalances(year);
          set({ leaveBalances });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      fetchLeaveRequests: async (params) => {
        set({ isLoading: true, error: null });
        try {
          const { data, meta } = await attendanceApi.getLeaveRequests(params);
          set({ leaveRequests: data, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
        }
      },

      createLeaveRequest: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const request = await attendanceApi.createLeaveRequest(data);
          set((state) => ({
            leaveRequests: [request, ...state.leaveRequests],
            isLoading: false,
          }));
          return request;
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      cancelLeaveRequest: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await attendanceApi.cancelLeaveRequest(id);
          set((state) => ({
            leaveRequests: state.leaveRequests.map((r) =>
              r.id === id ? { ...r, status: 'CANCELLED' as const } : r
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      fetchOvertimeRequests: async (params) => {
        set({ isLoading: true, error: null });
        try {
          const { data, meta } = await attendanceApi.getOvertimeRequests(params);
          set({ overtimeRequests: data, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
        }
      },

      createOvertimeRequest: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const request = await attendanceApi.createOvertimeRequest(data);
          set((state) => ({
            overtimeRequests: [request, ...state.overtimeRequests],
            isLoading: false,
          }));
          return request;
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      fetchShifts: async () => {
        try {
          const shifts = await attendanceApi.getShifts();
          set({ shifts });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      fetchRosters: async (params) => {
        try {
          const rosters = await attendanceApi.getRosters(params);
          set({ rosters });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      fetchMyRoster: async (params) => {
        try {
          const rosters = await attendanceApi.getMyRoster(params);
          set({ rosters });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'attendance-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        leaveTypes: state.leaveTypes,
        shifts: state.shifts,
      }),
    }
  )
);