'use client';

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import styles from './LoginScreen.style';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  tenantId: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberTenant, setRememberTenant] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      tenantId: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password, data.tenantId || undefined);
      router.replace('/(dashboard)');
    } catch {
      // Error handled in store
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>F</Text>
          </View>
          <Text style={styles.appName}>Flexy HRMS</Text>
          <Text style={styles.tagline}>Manajemen SDM Modern</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.welcomeTitle}>Selamat Datang</Text>
          <Text style={styles.welcomeSubtitle}>Masuk untuk melanjutkan ke akun Anda</Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="nama@perusahaan.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCompleteType="email"
              {...(control as any).register('email')}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              autoCompleteType="password"
              {...(control as any).register('password')}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tenant ID (Opsional)</Text>
            <TextInput
              style={styles.input}
              placeholder="default"
              autoCapitalize="none"
              {...(control as any).register('tenantId')}
            />
            {errors.tenantId && <Text style={styles.errorText}>{errors.tenantId.message}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Masuk</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ATAU</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.ssoButton}
            onPress={() => Alert.alert('SSO Login', 'Fitur SSO (SAML) akan segera hadir. Silakan hubungi admin untuk konfigurasi.')}
            activeOpacity={0.8}
          >
            <Text style={styles.ssoButtonText}>🔐 Masuk dengan SSO (SAML)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Flexy HRMS v1.0.0</Text>
          <Text style={styles.footerText}>© 2024 PT Flexy Indonesia</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}