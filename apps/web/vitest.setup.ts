import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: null,
    status: 'unauthenticated',
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Mock TanStack Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  }),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock Radix UI portals
vi.mock('@radix-ui/react-dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => children,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => children,
  DialogContent: ({ children }: { children: React.ReactNode }) => children,
  DialogTitle: ({ children }: { children: React.ReactNode }) => children,
  DialogDescription: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@radix-ui/react-dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    promise: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}))

// Mock face-api.js
vi.mock('face-api.js', () => ({
  nets: {
    loadFromUri: vi.fn().mockResolvedValue(undefined),
  },
  detectAllFaces: vi.fn().mockReturnValue({
    withFaceLandmarks: vi.fn().mockReturnValue({
      withFaceDescriptors: vi.fn().mockResolvedValue([]),
    }),
  }),
  FaceMatcher: vi.fn(),
  FaceLandmarks68: class {},
}))

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: '2099-12-31',
    },
    status: 'authenticated',
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// MatchMedia mock
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})