import React, { useState, useMemo } from 'react';
import PremiumSelect from './PremiumSelect';

// Helper for Initials Avatar
export const UserAvatar = ({ name = '', index = 0, style = {} }) => {
  const getInitials = (str) => {
    if (!str) return '??';
    const clean = String(str).trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (idx) => {
    const colors = [
      { bg: '#f3e8ff', color: '#7e22ce' }, // soft purple/lavender
      { bg: '#dbeafe', color: '#1d4ed8' }, // soft blue
      { bg: '#dcfce7', color: '#15803d' }, // soft green
      { bg: '#fef3c7', color: '#b45309' }, // soft amber
      { bg: '#ffe4e6', color: '#be185d' }, // soft pink
      { bg: '#e0e7ff', color: '#4338ca' }  // soft indigo
    ];
    return colors[idx % colors.length];
  };

  const avatarStyle = getAvatarColor(index);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', ...style }}>
      <div style={{
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        background: avatarStyle.bg,
        color: avatarStyle.color,
        fontWeight: 700,
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
      }}>
        {getInitials(name)}
      </div>
      <span style={{ fontWeight: 700, color: 'var(--text-primary, #ffffff)', fontSize: '14px' }}>
        {name}
      </span>
    </div>
  );
};

// Helper for Status Badge
export const TableStatusBadge = ({ status = 'Active', style = {} }) => {
  const isActive = status === true || String(status).toLowerCase() === 'true' || String(status).toLowerCase() === 'active';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '6px 14px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
      background: isActive ? '#dcfce7' : '#fee2e2',
      color: isActive ? '#15803d' : '#b91c1c',
      ...style
    }}>
      {isActive ? 'Active' : 'InActive'}
    </span>
  );
};

// Helper for Role Badge
export const TableRoleBadge = ({ role = 'User', style = {} }) => {
  const r = String(role).toLowerCase();
  let bg = '#fef3c7';
  let color = '#b45309';

  if (r.includes('super')) {
    bg = '#f3e8ff';
    color = '#7e22ce';
  } else if (r.includes('admin')) {
    bg = '#e0f2fe';
    color = '#0369a1';
  } else if (r.includes('editor')) {
    bg = '#fef3c7';
    color = '#b45309';
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '6px 14px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
      background: bg,
      color: color,
      ...style
    }}>
      {role}
    </span>
  );
};

// Helper for Action Icon Buttons
export const TableActionButton = ({ icon, onClick, title, type = 'secondary', style = {} }) => {
  const isDelete = type === 'delete' || type === 'danger';
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        border: isDelete ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color, rgba(255,255,255,0.08))',
        background: 'var(--bg-card, #121217)',
        color: isDelete ? '#ef4444' : 'var(--text-secondary, #94a3b8)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '13px',
        transition: 'all 0.15s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        if (isDelete) {
          e.currentTarget.style.background = '#fef2f2';
          e.currentTarget.style.borderColor = '#fca5a5';
        } else {
          e.currentTarget.style.borderColor = '#c7d2fe';
          e.currentTarget.style.color = '#4f46e5';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        if (isDelete) {
          e.currentTarget.style.background = 'var(--bg-card, #ffffff)';
          e.currentTarget.style.borderColor = '#fee2e2';
        } else {
          e.currentTarget.style.borderColor = 'var(--border-color, #e2e8f0)';
          e.currentTarget.style.color = '#64748b';
        }
      }}
    >
      <i className={icon}></i>
    </button>
  );
};

const PaginatedTable = ({ 
  headers = [], 
  data = [], 
  renderRow, 
  emptyMessage = "No records found", 
  defaultItemsPerPage = 5,
  showSearch = true,
  searchPlaceholder = "Search by name, email or mobile...",
  statusFilterOptions = ['All', 'Active', 'InActive'],
  showStatusFilter = true,
  onStatusFilterChange,
  showExport = true,
  onExport,
  tableStyle = {},
  tableClassName = "data-table"
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortColumnIndex, setSortColumnIndex] = useState(null);
  const [sortDirection, setSortDirection] = useState(null); // 'asc' | 'desc' | null

  // Real-time Filtering (Search + Status Filter)
  const filteredData = useMemo(() => {
    let result = data;

    // Status Filter
    if (statusFilter && statusFilter !== 'All') {
      const targetStatus = statusFilter.toLowerCase();
      result = result.filter(item => {
        if (!item) return false;
        const s = String(item.status || item.active || '').toLowerCase();
        if (targetStatus === 'active') {
          return s === 'active' || s === 'true' || item.status === true;
        }
        if (targetStatus === 'inactive') {
          return s === 'inactive' || s === 'false' || item.status === false;
        }
        return s === targetStatus;
      });
    }

    // Search Query Filter
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        if (item === null || item === undefined) return false;
        if (typeof item === 'string' || typeof item === 'number') {
          return String(item).toLowerCase().includes(q);
        }
        if (typeof item === 'object') {
          return Object.values(item).some(val => {
            if (val === null || val === undefined) return false;
            if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
              return String(val).toLowerCase().includes(q);
            }
            return false;
          });
        }
        return false;
      });
    }

    return result;
  }, [data, searchQuery, statusFilter]);

  // Extract sort key
  const getSortKeyForItem = (item, headerObj, colIndex) => {
    if (!item || typeof item !== 'object') return item;
    
    if (typeof headerObj === 'object' && (headerObj.key || headerObj.field)) {
      const k = headerObj.key || headerObj.field;
      if (item[k] !== undefined) return item[k];
    }
    
    const labelStr = (typeof headerObj === 'object' ? headerObj.label : String(headerObj)).toLowerCase().trim();
    
    if (labelStr.includes('name') || labelStr.includes('admin') || labelStr.includes('user')) {
      if (item.name) return item.name;
      if (item.first_name) return `${item.first_name} ${item.last_name || ''}`;
      if (item.title) return item.title;
    }
    if (labelStr.includes('email')) return item.email;
    if (labelStr.includes('mobile') || labelStr.includes('phone')) return item.phonenumber || item.mobile || item.phone;
    if (labelStr.includes('status')) return item.status;
    if (labelStr.includes('role')) return item.role;
    if (labelStr.includes('date') || labelStr.includes('time') || labelStr.includes('created')) return item.date || item.timestamp || item.created_at;

    const camelKey = labelStr.replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
    const snakeKey = labelStr.replace(/[^a-zA-Z0-9]+/g, '_');
    if (item[camelKey] !== undefined) return item[camelKey];
    if (item[snakeKey] !== undefined) return item[snakeKey];
    if (item[labelStr] !== undefined) return item[labelStr];

    const keys = Object.keys(item);
    if (keys[colIndex] !== undefined) return item[keys[colIndex]];

    return '';
  };

  // Sorting
  const sortedData = useMemo(() => {
    if (sortColumnIndex === null || !sortDirection) return filteredData;
    const headerObj = headers[sortColumnIndex];
    
    return [...filteredData].sort((a, b) => {
      let valA = getSortKeyForItem(a, headerObj, sortColumnIndex);
      let valB = getSortKeyForItem(b, headerObj, sortColumnIndex);

      if (valA === valB) return 0;
      if (valA === null || valA === undefined || valA === '') return 1;
      if (valB === null || valB === undefined || valB === '') return -1;

      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valB !== 'boolean') {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      const comp = strA.localeCompare(strB);
      return sortDirection === 'asc' ? comp : -comp;
    });
  }, [filteredData, sortColumnIndex, sortDirection, headers]);

  // Pagination calculation
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? 1 : (currentPage < 1 ? 1 : currentPage);

  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = sortedData.slice(startIndex, endIndex);

  // Column Sort Click Handler
  const handleHeaderClick = (index, header) => {
    const label = typeof header === 'object' ? header.label : String(header);
    const isSortable = typeof header === 'object' ? header.sortable !== false : true;
    
    if (!isSortable || label === '#' || label.toLowerCase().includes('action') || label.trim() === '') {
      return;
    }

    if (sortColumnIndex === index) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') {
        setSortColumnIndex(null);
        setSortDirection(null);
      }
    } else {
      setSortColumnIndex(index);
      setSortDirection('asc');
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (totalPages <= 5 || i === 1 || i === totalPages || Math.abs(i - activePage) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  // Export handler default CSV export
  const handleExportCSV = () => {
    if (onExport) {
      onExport(sortedData);
      return;
    }
    if (!sortedData || sortedData.length === 0) return;
    try {
      const first = sortedData[0];
      const keys = Object.keys(first).filter(k => typeof first[k] !== 'object' && typeof first[k] !== 'function');
      const csvContent = "data:text/csv;charset=utf-8," 
        + keys.join(",") + "\n"
        + sortedData.map(row => keys.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `table_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  return (
    <div style={{
      width: '100%',
      background: 'var(--bg-card, #121217)',
      borderRadius: '20px',
      border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
      padding: '24px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      
      {/* Top Header Control Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Left: Clean Search Bar */}
        {showSearch && (
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            minWidth: '280px',
            flex: '1 1 280px',
            maxWidth: '380px'
          }}>
            <i className="fa-solid fa-magnifying-glass" style={{
              position: 'absolute',
              left: '16px',
              color: '#94a3b8',
              fontSize: '14px'
            }}></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                paddingLeft: '44px',
                paddingRight: searchQuery ? '36px' : '16px',
                height: '44px',
                fontSize: '13px',
                borderRadius: '10px',
                background: 'var(--input-bg, #1a1a22)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                color: 'var(--text-primary, #ffffff)',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: '4px'
                }}
                title="Clear Search"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        )}

        {/* Right Controls: Status Filter & Export Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {showStatusFilter && (
            <div style={{ minWidth: '150px' }}>
              <PremiumSelect
                options={statusFilterOptions.map(opt => ({ id: opt, name: `Status: ${opt}` }))}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                  if (onStatusFilterChange) onStatusFilterChange(e.target.value);
                }}
                searchable={false}
                icon="fa-solid fa-sliders"
                style={{ height: '44px', borderRadius: '10px' }}
              />
            </div>
          )}

          {showExport && (
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '44px',
                padding: '0 20px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                background: 'var(--bg-card, #121217)',
                color: 'var(--text-primary, #ffffff)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-secondary, #7c3aed)';
                e.currentTarget.style.background = 'rgba(124, 58, 237, 0.12)';
                e.currentTarget.style.color = 'var(--accent-secondary, #7c3aed)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color, rgba(255,255,255,0.1))';
                e.currentTarget.style.background = 'var(--bg-card, #121217)';
                e.currentTarget.style.color = 'var(--text-primary, #ffffff)';
              }}
            >
              <i className="fa-solid fa-download" style={{ fontSize: '13px', color: '#64748b' }}></i>
              Export
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="table-container" style={{
        overflowX: 'auto',
        width: '100%',
        borderRadius: '14px',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))'
      }}>
        <table className={tableClassName} style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, ...tableStyle }}>
          <thead>
            <tr style={{ background: '#f3e8ff' }}>
              {headers.map((h, i) => {
                const label = typeof h === 'object' ? h.label : h;
                const isSortable = typeof h === 'object' ? h.sortable !== false : true;
                const canSort = isSortable && label !== '#' && !label.toLowerCase().includes('action') && label.trim() !== '';
                const isSorted = sortColumnIndex === i && sortDirection;

                return (
                  <th 
                    key={i} 
                    onClick={() => canSort && handleHeaderClick(i, h)}
                    style={{
                      padding: '16px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.6px',
                      textTransform: 'uppercase',
                      color: '#7c3aed',
                      backgroundColor: '#f3e8ff',
                      borderBottom: 'none',
                      borderTopLeftRadius: i === 0 ? '12px' : '0',
                      borderBottomLeftRadius: i === 0 ? '12px' : '0',
                      borderTopRightRadius: i === headers.length - 1 ? '12px' : '0',
                      borderBottomRightRadius: i === headers.length - 1 ? '12px' : '0',
                      cursor: canSort ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                      ...(typeof h === 'object' ? h.style : {})
                    }}
                    className={typeof h === 'object' ? h.className : ''}
                    title={canSort ? `Click to sort by ${label}` : undefined}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>{label}</span>
                      {canSort && (
                        <span style={{ fontSize: '11px', opacity: isSorted ? 1 : 0.4 }}>
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <i className="fa-solid fa-sort-up"></i>
                            ) : (
                              <i className="fa-solid fa-sort-down"></i>
                            )
                          ) : (
                            <i className="fa-solid fa-sort" style={{ opacity: 0.5 }}></i>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((item, index) => renderRow(item, startIndex + index))
            ) : (
              <tr>
                <td colSpan={headers.length} style={{ textAlign: 'center', padding: '56px 16px', color: '#94a3b8' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <i className="fa-solid fa-folder-open" style={{ color: '#6e56f8' }}></i>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>{emptyMessage}</span>
                    {(searchQuery || statusFilter !== 'All') && (
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '12px', marginTop: '4px' }}
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Bar */}
      {totalItems > 0 && (
        <div className="pagination-controls" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: '8px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Entries Info */}
          <div style={{ fontSize: '13px', color: 'var(--text-secondary, #a0a0ab)' }}>
            Showing <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{startIndex + 1}</strong> to <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{Math.min(endIndex, totalItems)}</strong> of <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{totalItems}</strong> entries
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {/* Rows Per Page Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary, #a0a0ab)' }}>Rows per page:</span>
              <PremiumSelect
                options={[
                  { id: 5, name: '5' },
                  { id: 10, name: '10' },
                  { id: 20, name: '20' },
                  { id: 50, name: '50' }
                ]}
                value={String(itemsPerPage)}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                searchable={false}
                dropUp={true}
                icon="fa-solid fa-list"
                style={{ minWidth: '95px', width: '95px', height: '36px', borderRadius: '8px' }}
              />
            </div>

            {/* Page Buttons */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentPage(prev => Math.max(prev - 1, 1));
                }}
                disabled={activePage === 1}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  background: activePage === 1 ? 'transparent' : 'var(--bg-card, #ffffff)',
                  color: activePage === 1 ? 'var(--text-secondary, #94a3b8)' : 'var(--text-primary, #0f172a)',
                  opacity: activePage === 1 ? 0.5 : 1,
                  cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                &lt; Prev
              </button>
              
              {getPageNumbers().map((pageNum, idx) => {
                if (pageNum === '...') {
                  return <span key={`dots-${idx}`} style={{ color: 'var(--text-secondary, #94a3b8)', padding: '0 4px', fontSize: '13px' }}>...</span>;
                }
                const isActive = activePage === pageNum;
                return (
                  <button
                    type="button"
                    key={`page-${pageNum}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentPage(pageNum);
                    }}
                    style={{ 
                      minWidth: '36px', 
                      height: '36px', 
                      padding: '0 8px',
                      fontSize: '13px', 
                      fontWeight: 700,
                      borderRadius: '8px',
                      border: isActive ? 'none' : '1px solid var(--border-color, #e2e8f0)',
                      background: isActive ? '#4f46e5' : 'var(--bg-card, #ffffff)',
                      color: isActive ? '#ffffff' : 'var(--text-primary, #0f172a)',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 4px 14px rgba(79, 70, 229, 0.35)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentPage(prev => Math.min(prev + 1, totalPages));
                }}
                disabled={activePage === totalPages}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  background: activePage === totalPages ? 'transparent' : 'var(--bg-card, #ffffff)',
                  color: activePage === totalPages ? 'var(--text-secondary, #94a3b8)' : 'var(--text-primary, #0f172a)',
                  opacity: activePage === totalPages ? 0.5 : 1,
                  cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                Next &gt;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaginatedTable;
