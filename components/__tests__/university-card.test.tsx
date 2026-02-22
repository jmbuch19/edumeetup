import React from 'react'
import { render, screen } from '@testing-library/react'
import { UniversityCard } from '../university-card'

// Define a minimal mock type matching what the component uses
type MockUniversity = {
  id: string
  institutionName: string
  city: string | null
  country: string
  verificationStatus: string
  programs?: { fieldCategory?: unknown; field?: unknown }[]
  // Add other fields that might be required by UniversityProfile if strict typing is needed,
  // but for the purpose of the test, we can cast to any to satisfy the prop type.
}

describe('UniversityCard', () => {
  const mockUniversity: MockUniversity = {
    id: 'uni-123',
    institutionName: 'Test University',
    city: 'Test City',
    country: 'Test Country',
    verificationStatus: 'VERIFIED',
    programs: [
      { fieldCategory: 'Science' },
      { fieldCategory: 'Arts' },
    ],
  }

  // Cast mockUniversity to any to bypass strict UniversityProfile type checking
  // as we only need to provide fields used by the component.
  const props = {
    university: mockUniversity as any
  }

  it('renders university information correctly', () => {
    render(<UniversityCard {...props} />)

    expect(screen.getByText('Test University')).toBeInTheDocument()
    expect(screen.getByText(/Test City, Test Country/)).toBeInTheDocument()
  })

  it('renders "Verified" badge when verificationStatus is VERIFIED', () => {
    render(<UniversityCard {...props} />)

    const verifiedBadge = screen.getByText('Verified')
    expect(verifiedBadge).toBeInTheDocument()
    expect(verifiedBadge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('does not render "Verified" badge when verificationStatus is not VERIFIED', () => {
    const unverifiedProps = {
      university: {
        ...mockUniversity,
        verificationStatus: 'PENDING',
      } as any
    }
    render(<UniversityCard {...unverifiedProps} />)

    expect(screen.queryByText('Verified')).not.toBeInTheDocument()
  })

  it('renders the correct number of programs', () => {
    render(<UniversityCard {...props} />)

    // The component renders: <span ...>{university.programs?.length || 0}</span> Programs Available
    // We can look for "2" inside the container or construct a regex.
    // Given the markup: <span className="font-medium text-gray-900">2</span> Programs Available

    // We can verify the text content of the element containing "Programs Available"
    const programsText = screen.getByText(/Programs Available/)
    expect(programsText).toHaveTextContent('2 Programs Available')
  })

  it('renders 0 programs available when programs list is empty or undefined', () => {
    const noProgramsProps = {
      university: {
        ...mockUniversity,
        programs: [],
      } as any
    }
    const { rerender } = render(<UniversityCard {...noProgramsProps} />)

    expect(screen.getByText(/Programs Available/)).toHaveTextContent('0 Programs Available')

    const undefinedProgramsProps = {
        university: {
          ...mockUniversity,
          programs: undefined,
        } as any
      }
    rerender(<UniversityCard {...undefinedProgramsProps} />)
    expect(screen.getByText(/Programs Available/)).toHaveTextContent('0 Programs Available')
  })

  it('renders a link to the university details page', () => {
    render(<UniversityCard {...props} />)

    const link = screen.getByRole('link', { name: /View Details/i })
    expect(link).toHaveAttribute('href', '/universities/uni-123')
  })
})
