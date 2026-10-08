import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

// Mock component for testing
const TestComponent = ({ onClick }: { onClick: () => void }) => (
  <Button onClick={onClick}>Click me</Button>
)

describe('Button Component', () => {
  it('renders button with children', () => {
    render(<TestComponent onClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<TestComponent onClick={handleClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant classes correctly', () => {
    const { rerender } = render(<TestComponent onClick={vi.fn()} />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary')
    
    // Test variant props would go here
  })
})

describe('Utility Functions', () => {
  it('formats currency correctly', () => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(amount)
    }
    
    // Indonesian locale uses non-breaking space (U+00A0) between symbol and amount
    const nbsp = '\u00A0'
    expect(formatCurrency(1000000)).toBe(`Rp${nbsp}1.000.000`)
    expect(formatCurrency(0)).toBe(`Rp${nbsp}0`)
    expect(formatCurrency(1500000)).toBe(`Rp${nbsp}1.500.000`)
  })

  it('formats date correctly', () => {
    const formatDate = (date: Date | string, locale = 'id-ID') => {
      return new Date(date).toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    }
    
    expect(formatDate('2026-01-15')).toBe('15 Januari 2026')
  })

  it('handles zero and negative currency amounts', () => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(amount)
    }
    const nbsp = ' '
    expect(formatCurrency(0)).toBe(`Rp${nbsp}0`)
    expect(formatCurrency(-500000)).toContain('500.000')
  })
})

describe('Date Utilities', () => {
  it('calculates working days between dates', () => {
    const getWorkingDays = (start: Date, end: Date): number => {
      let count = 0
      const current = new Date(start)
      while (current <= end) {
        const day = current.getDay()
        if (day !== 0 && day !== 6) count++
        current.setDate(current.getDate() + 1)
      }
      return count
    }
    
    // Monday to Friday = 5 working days
    expect(getWorkingDays(new Date('2026-01-05'), new Date('2026-01-09'))).toBe(5)
    
    // Including weekend = still 5 working days
    expect(getWorkingDays(new Date('2026-01-10'), new Date('2026-01-16'))).toBe(5)
  })

  it('returns 0 for inverted date ranges', () => {
    const getWorkingDays = (start: Date, end: Date): number => {
      let count = 0
      const current = new Date(start)
      while (current <= end) {
        const day = current.getDay()
        if (day !== 0 && day !== 6) count++
        current.setDate(current.getDate() + 1)
      }
      return count
    }
    expect(getWorkingDays(new Date('2026-01-09'), new Date('2026-01-05'))).toBe(0)
  })
})