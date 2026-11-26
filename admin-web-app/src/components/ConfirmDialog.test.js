import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog Component', () => {
  test('does not render when isOpen is false', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Delete Item"
        message="Are you sure?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders dialog content when isOpen is true', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Delete"
        message="Are you sure you want to delete this course?"
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this course?')).toBeInTheDocument();
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('calls onConfirm when confirm button is clicked', () => {
    const handleConfirm = jest.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete"
        message="Delete now?"
        confirmText="Delete"
        onConfirm={handleConfirm}
        onCancel={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  test('calls onCancel when cancel button is clicked', () => {
    const handleCancel = jest.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete"
        message="Delete now?"
        confirmText="Delete"
        cancelText="No, Keep"
        onConfirm={jest.fn()}
        onCancel={handleCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'No, Keep' }));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
