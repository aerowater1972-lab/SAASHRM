import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import * as documentsApi from '@/lib/api/documents';
import type {
  HrDocument,
  DocumentCategory,
  DocumentVersion,
  DocumentPermission,
  DocumentSignature,
  DocumentActivity,
  DocumentListParams,
} from '@/lib/api/documents';

export function useDocumentCategories() {
  return useQuery<DocumentCategory[], Error>({
    queryKey: queryKeys.documents.categories,
    queryFn: documentsApi.fetchDocumentCategories,
  });
}

export function useDocuments(params?: DocumentListParams) {
  return useQuery<HrDocument[], Error>({
    queryKey: queryKeys.documents.all,
    queryFn: () => documentsApi.fetchDocuments(params),
  });
}

export function useDocument(id: string) {
  return useQuery<HrDocument, Error>({
    queryKey: queryKeys.documents.detail(id),
    queryFn: () => documentsApi.fetchDocument(id),
    enabled: !!id,
  });
}

export function useDocumentActivities(id: string) {
  return useQuery<DocumentActivity[], Error>({
    queryKey: queryKeys.documents.activities(id),
    queryFn: () => documentsApi.fetchDocumentActivities(id),
    enabled: !!id,
  });
}

export function useCreateDocumentCategory() {
  const queryClient = useQueryClient();
  return useMutation<DocumentCategory, Error, Record<string, unknown>>({
    mutationFn: documentsApi.createDocumentCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.categories });
    },
  });
}

export function useUpdateDocumentCategory() {
  const queryClient = useQueryClient();
  return useMutation<DocumentCategory, Error, { id: string; data: Record<string, unknown> }>({
    mutationFn: ({ id, data }) => documentsApi.updateDocumentCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.categories });
    },
  });
}

export function useDeleteDocumentCategory() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: documentsApi.deleteDocumentCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.categories });
    },
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation<HrDocument, Error, Record<string, unknown>>({
    mutationFn: documentsApi.createDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation<HrDocument, Error, { id: string; data: Record<string, unknown> }>({
    mutationFn: ({ id, data }) => documentsApi.updateDocument(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}

export function useUpdateDocumentStatus() {
  const queryClient = useQueryClient();
  return useMutation<HrDocument, Error, { id: string; status: string }>({
    mutationFn: ({ id, status }) => documentsApi.updateDocumentStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: documentsApi.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}

export function useCreateDocumentVersion() {
  const queryClient = useQueryClient();
  return useMutation<DocumentVersion, Error, { id: string; data: Record<string, unknown> }>({
    mutationFn: ({ id, data }) => documentsApi.createDocumentVersion(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.detail(variables.id) });
    },
  });
}

export function useAddDocumentPermission() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, { id: string; data: Record<string, unknown> }>({
    mutationFn: ({ id, data }) => documentsApi.addDocumentPermission(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.detail(variables.id) });
    },
  });
}

export function useRequestDocumentSignature() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, { id: string; userIds: string[] }>({
    mutationFn: ({ id, userIds }) => documentsApi.requestDocumentSignature(id, userIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.detail(variables.id) });
    },
  });
}