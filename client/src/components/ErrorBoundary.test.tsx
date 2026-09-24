/**
 * Covers the boundary's three states: children, caught error, and recovery.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

const Boom = ({ fail }: { fail: boolean }) => {
  if (fail) throw new Error('the panel exploded');
  return <p>panel contents</p>;
};

describe('ErrorBoundary', () => {
  it('renders its children when nothing goes wrong', () => {
    render(
      <ErrorBoundary>
        <Boom fail={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('panel contents')).toBeInTheDocument();
  });

  it('shows the failure instead of unmounting the app', () => {
    // React logs the caught error itself; silence it so the run stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom fail />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('the panel exploded')).toBeInTheDocument();
  });

  it('retries the subtree when the cause has gone away', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();

    const Harness = () => {
      const [fail, setFail] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setFail(false)}>
            fix it
          </button>
          <ErrorBoundary>
            <Boom fail={fail} />
          </ErrorBoundary>
        </>
      );
    };

    render(<Harness />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'fix it' }));
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('panel contents')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
