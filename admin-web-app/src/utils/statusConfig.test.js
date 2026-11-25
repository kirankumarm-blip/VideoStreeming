import React from 'react';
import { render, screen } from '@testing-library/react';
import { getUserStatusConfig, USER_STATUS_CONFIG, USER_STATUS_MAP } from './statusConfig';
import { TableStatusBadge, UserStatusBadge } from '../components/PaginatedTable';

describe('User Status Mapping & Badge Logic', () => {
  describe('1. USER_STATUS_CONFIG mapping structure', () => {
    test('defines canonical mappings for all statuses with label, color, background, and className', () => {
      expect(USER_STATUS_CONFIG.active).toBeDefined();
      expect(USER_STATUS_CONFIG.inactive).toBeDefined();
      expect(USER_STATUS_CONFIG.blocked).toBeDefined();
      expect(USER_STATUS_CONFIG.unknown).toBeDefined();

      expect(USER_STATUS_CONFIG.active.label).toBe('Active');
      expect(USER_STATUS_CONFIG.active.color).toBe('#10b981');
      expect(USER_STATUS_CONFIG.active.className).toBe('badge-active');

      expect(USER_STATUS_CONFIG.blocked.label).toBe('Blocked');
      expect(USER_STATUS_CONFIG.blocked.color).toBe('#ef4444');
      expect(USER_STATUS_CONFIG.blocked.className).toBe('badge-disabled');

      expect(USER_STATUS_CONFIG.unknown.label).toBe('Unknown');
      expect(USER_STATUS_CONFIG.unknown.color).toBe('#6b7280');
      expect(USER_STATUS_CONFIG.unknown.className).toBe('badge-unknown');

      expect(USER_STATUS_MAP).toBe(USER_STATUS_CONFIG);
    });
  });

  describe('2. getUserStatusConfig condition checks', () => {
    test('missing or null status returns Unknown, NOT ACTIVE', () => {
      const nullResult = getUserStatusConfig(null);
      expect(nullResult.key).toBe('unknown');
      expect(nullResult.label).toBe('Unknown');
      expect(nullResult.label).not.toBe('ACTIVE');

      const undefResult = getUserStatusConfig(undefined);
      expect(undefResult.key).toBe('unknown');
      expect(undefResult.label).toBe('Unknown');

      const emptyResult = getUserStatusConfig('');
      expect(emptyResult.key).toBe('unknown');
      expect(emptyResult.label).toBe('Unknown');

      const whitespaceResult = getUserStatusConfig('   ');
      expect(whitespaceResult.key).toBe('unknown');
      expect(whitespaceResult.label).toBe('Unknown');
    });

    test('unexpected or unrecognised status returns Unknown, NOT ACTIVE', () => {
      expect(getUserStatusConfig('weird_status').key).toBe('unknown');
      expect(getUserStatusConfig('weird_status').label).toBe('Unknown');
      expect(getUserStatusConfig('foobar').label).toBe('Unknown');
      expect(getUserStatusConfig(999).label).toBe('Unknown');
      expect(getUserStatusConfig({}).label).toBe('Unknown');
    });

    test('blocked status resolves strictly to blocked and NEVER counts as active', () => {
      const blockedLower = getUserStatusConfig('blocked');
      expect(blockedLower.key).toBe('blocked');
      expect(blockedLower.label).toBe('Blocked');
      expect(blockedLower.key).not.toBe('active');
      expect(blockedLower.className).toBe('badge-disabled');

      const blockedUpper = getUserStatusConfig('BLOCKED');
      expect(blockedUpper.key).toBe('blocked');
      expect(blockedUpper.label).toBe('Blocked');
      expect(blockedUpper.key).not.toBe('active');

      const blockShort = getUserStatusConfig('block');
      expect(blockShort.key).toBe('blocked');
    });

    test('active status variants resolve correctly to active', () => {
      expect(getUserStatusConfig('active').key).toBe('active');
      expect(getUserStatusConfig('ACTIVE').key).toBe('active');
      expect(getUserStatusConfig('Active').key).toBe('active');
      expect(getUserStatusConfig(true).key).toBe('active');
      expect(getUserStatusConfig('true').key).toBe('active');
      expect(getUserStatusConfig(1).key).toBe('active');
      expect(getUserStatusConfig('1').key).toBe('active');
      expect(getUserStatusConfig('enabled').key).toBe('active');
    });

    test('inactive status variants resolve correctly to inactive or disabled', () => {
      expect(getUserStatusConfig('inactive').key).toBe('inactive');
      expect(getUserStatusConfig('INACTIVE').key).toBe('inactive');
      expect(getUserStatusConfig(false).key).toBe('inactive');
      expect(getUserStatusConfig('false').key).toBe('inactive');
      expect(getUserStatusConfig(0).key).toBe('inactive');
      expect(getUserStatusConfig('0').key).toBe('inactive');
      expect(getUserStatusConfig('disabled').key).toBe('disabled');
    });

    test('pending status resolves correctly to pending', () => {
      expect(getUserStatusConfig('pending').key).toBe('pending');
      expect(getUserStatusConfig('PENDING').label).toBe('Pending');
    });
  });

  describe('3. Component Badge Rendering (TableStatusBadge & UserStatusBadge)', () => {
    test('renders Unknown badge when status is missing (undefined/null)', () => {
      const { rerender } = render(<TableStatusBadge />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
      expect(screen.queryByText('Active')).not.toBeInTheDocument();
      expect(screen.queryByText('ACTIVE')).not.toBeInTheDocument();

      rerender(<TableStatusBadge status={null} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();

      rerender(<TableStatusBadge status={undefined} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();

      rerender(<TableStatusBadge status="" />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    test('renders Unknown badge when status is an unexpected string', () => {
      render(<TableStatusBadge status="unexpected_role_string" />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
      expect(screen.queryByText('ACTIVE')).not.toBeInTheDocument();
    });

    test('renders Blocked badge with disabled styling for blocked user', () => {
      render(<TableStatusBadge status="blocked" />);
      const badge = screen.getByText('Blocked');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('badge-disabled');
      expect(badge.style.color).toBe('rgb(239, 68, 68)');
    });

    test('renders Active badge with active styling for active user', () => {
      render(<TableStatusBadge status="active" />);
      const badge = screen.getByText('Active');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('badge-active');
      expect(badge.style.color).toBe('rgb(16, 185, 129)');
    });

    test('UserStatusBadge renders identically to TableStatusBadge', () => {
      render(<UserStatusBadge status="blocked" />);
      expect(screen.getByText('Blocked')).toBeInTheDocument();
    });
  });
});
