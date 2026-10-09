import { Tabs } from 'expo-router';
import { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useColorScheme } from 'react-native';

const colors = {
  light: {
    background: '#f8fafc',
    card: '#fff',
    primary: '#1e3a8a',
    primaryLight: '#dbeafe',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
    tabActive: '#1e3a8a',
    tabInactive: '#94a3b8',
  },
  dark: {
    background: '#0f172a',
    card: '#1e293b',
    primary: '#3b82f6',
    primaryLight: '#1e3a8a',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#334155',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    tabActive: '#60a5fa',
    tabInactive: '#64748b',
  },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || 'light'];
  const { user, permissions } = useAuthStore();

  const canAccessPayroll = permissions.includes('payroll:run:read') || permissions.includes('payroll:payslip:read');
  const canAccessAdmin = permissions.includes('admin:user:read') || permissions.includes('admin:tenant:read');
  const canApprove = permissions.includes('leave-requests:approve') || permissions.includes('overtime:approve');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 8,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Absensi',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'calendar-outline' : 'calendar'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leave"
        options={{
          title: 'Cuti',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'calendar-clear-outline' : 'calendar-clear'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="overtime"
        options={{
          title: 'Lembur',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'time-outline' : 'time'} size={24} color={color} />
          ),
        }}
      />
      {canAccessPayroll && (
        <Tabs.Screen
          name="payroll"
          options={{
            title: 'Payroll',
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'cash-outline' : 'cash'} size={24} color={color} />
            ),
          }}
        />
      )}
      {(canApprove || canAccessAdmin) && (
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Admin',
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'shield-checkmark-outline' : 'shield-checkmark'} size={24} color={color} />
            ),
          }}
        />
      )}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person-outline' : 'person'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}