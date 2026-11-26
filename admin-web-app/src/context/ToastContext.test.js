import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast, toast } from './ToastContext';

const TestComponent = () => {
  const { success, error, warn, info } = useToast();
  return (
    <div>
      <button onClick={() => success('Operation successful!')}>Show Success</button>
      <button onClick={() => error('Something went wrong!')}>Show Error</button>
      <button onClick={() => warn('Attention needed!')}>Show Warn</button>
      <button onClick={() => info('Information message')}>Show Info</button>
    </div>
  );
};

describe('ToastContext & ToastProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test('renders toast notification when triggered via hook', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Operation successful!')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
  });

  test('auto-dismisses toast after duration expires', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));
    expect(screen.getByText('Information message')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(4500);
    });

    expect(screen.queryByText('Information message')).not.toBeInTheDocument();
  });

  test('dismisses toast when close button is clicked', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Warn'));
    expect(screen.getByText('Attention needed!')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Close notification');
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Attention needed!')).not.toBeInTheDocument();
  });

  test('works via global toast singleton', () => {
    render(
      <ToastProvider>
        <div>App Body</div>
      </ToastProvider>
    );

    act(() => {
      toast.success('Global toast message');
    });

    expect(screen.getByText('Global toast message')).toBeInTheDocument();
  });
});
