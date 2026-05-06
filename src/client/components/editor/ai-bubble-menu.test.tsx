import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AIActionMenu } from './ai-bubble-menu'

describe('AIActionMenu', () => {
  it('renders all 6 action buttons with correct labels', () => {
    render(<AIActionMenu onSelectAction={vi.fn()} />)

    expect(screen.getByText('Continue')).toBeInTheDocument()
    expect(screen.getByText('Improve')).toBeInTheDocument()
    expect(screen.getByText('Translate')).toBeInTheDocument()
    expect(screen.getByText('Summarize')).toBeInTheDocument()
    expect(screen.getByText('Fix grammar')).toBeInTheDocument()
    expect(screen.getByText('Change tone')).toBeInTheDocument()
  })

  it('clicking an action calls onSelectAction with correct action name', () => {
    const onSelectAction = vi.fn()
    render(<AIActionMenu onSelectAction={onSelectAction} />)

    fireEvent.click(screen.getByText('Improve'))
    expect(onSelectAction).toHaveBeenCalledWith('rewrite')

    fireEvent.click(screen.getByText('Fix grammar'))
    expect(onSelectAction).toHaveBeenCalledWith('fix-grammar')

    expect(onSelectAction).toHaveBeenCalledTimes(2)
  })

  it('buttons are disabled when loading is true', () => {
    render(<AIActionMenu onSelectAction={vi.fn()} loading={true} />)

    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })

  it('error message is displayed when error is set', () => {
    render(<AIActionMenu onSelectAction={vi.fn()} error="Something went wrong" />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('loading indicator is shown when loading is true', () => {
    render(<AIActionMenu onSelectAction={vi.fn()} loading={true} />)

    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  })

  it('does not show loading indicator when loading is false', () => {
    render(<AIActionMenu onSelectAction={vi.fn()} loading={false} />)

    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
  })

  it('does not show error when error is null', () => {
    render(<AIActionMenu onSelectAction={vi.fn()} error={null} />)

    expect(screen.queryAllByText(/./)).toHaveLength(6)
  })
})
