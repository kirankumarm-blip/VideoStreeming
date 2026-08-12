import React, { useState, useMemo } from 'react';
import PremiumSelect from './PremiumSelect';

const PaginatedTable = ({ 
  headers = [], 
  data = [], 
  renderRow, 
  emptyMessage = "No records found", 
  defaultItemsPerPage = 5,
  showSearch = true,
  searchPlaceholder = "Search in table...",
  tableStyle = {},
  tableClassName = "data-table"
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumnIndex, setSortColumnIndex] = useState(null);
  const [sortDirection, setSortDirection] = useState(null); // 'asc' | 'desc' | null

  // Real-time Search Filtering
  const filteredData = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data.filter(item => {
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
  }, [data, searchQuery]);

  // Helper to extract sort key from data item
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
      if (item.videoLesson) return item.videoLesson;
    }
    if (labelStr.includes('email')) return item.email;
    if (labelStr.includes('mobile') || labelStr.includes('phone')) return item.phonenumber || item.mobile || item.phone;
    if (labelStr.includes('status')) return item.status;
    if (labelStr.includes('date') || labelStr.includes('time') || labelStr.includes('created')) return item.date || item.timestamp || item.created_at || item.created_on;
    if (labelStr.includes('role')) return item.role;
    if (labelStr.includes('category')) return item.category || item.category_name || item.name;
    if (labelStr.includes('view')) return item.views;
    if (labelStr.includes('duration') || labelStr.includes('watch')) return item.duration || item.watchTime;
    if (labelStr.includes('growth') || labelStr.includes('progress') || labelStr.includes('completion')) return item.completionPercentage || item.growth || item.progress;

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

  return (
    <div className="paginated-table-wrapper" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* Premium Top Bar: Search + Stats + Rows Selector */}
      {showSearch && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Glass Search Input */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            minWidth: '240px',
            flex: '1 1 240px',
            maxWidth: '360px'
          }}>
            <i className="fa-solid fa-magnifying-glass" style={{
              position: 'absolute',
              left: '12px',
              color: 'var(--accent-primary, #e50914)',
              fontSize: '13px'
            }}></i>
            <input
              type="text"
              className="form-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                paddingLeft: '36px',
                paddingRight: searchQuery ? '32px' : '12px',
                height: '36px',
                fontSize: '13px',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'var(--text-primary, #ffffff)',
                transition: 'all 0.2s ease'
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
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary, #999)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '2px'
                }}
                title="Clear Search"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Stats Badge & Sort Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {searchQuery && (
              <span style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '20px',
                background: 'rgba(229, 9, 20, 0.15)',
                color: 'var(--accent-primary, #e50914)',
                border: '1px solid rgba(229, 9, 20, 0.3)',
                fontWeight: 600
              }}>
                Found {totalItems} match{totalItems === 1 ? '' : 'es'}
              </span>
            )}
            
            {sortColumnIndex !== null && sortDirection && (
              <span style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--text-secondary, #ccc)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                Sorted by <strong style={{ color: 'var(--text-primary, #fff)' }}>
                  {typeof headers[sortColumnIndex] === 'object' ? headers[sortColumnIndex].label : headers[sortColumnIndex]}
                </strong> ({sortDirection.toUpperCase()})
                <button
                  type="button"
                  onClick={() => { setSortColumnIndex(null); setSortDirection(null); }}
                  style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', marginLeft: '6px', fontSize: '11px' }}
                  title="Reset Sort"
                >
                  <i className="fa-solid fa-rotate-left"></i>
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="table-container" style={{
        overflowX: 'auto',
        width: '100%',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(255, 255, 255, 0.01)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)'
      }}>
        <table className={tableClassName} style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, ...tableStyle }}>
          <thead>
            <tr style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}>
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
                      padding: '14px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      color: isSorted ? 'var(--accent-primary, #e50914)' : 'var(--text-secondary, #aaa)',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
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
                              <i className="fa-solid fa-sort-up" style={{ color: 'var(--accent-primary, #e50914)' }}></i>
                            ) : (
                              <i className="fa-solid fa-sort-down" style={{ color: 'var(--accent-primary, #e50914)' }}></i>
                            )
                          ) : (
                            <i className="fa-solid fa-sort" style={{ color: '#888' }}></i>
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
                <td colSpan={headers.length} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary, #999)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      <i className="fa-solid fa-folder-open" style={{ color: 'var(--accent-primary, #e50914)' }}></i>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #fff)' }}>{emptyMessage}</span>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '12px', marginTop: '4px' }}
                      >
                        Clear Search Filter
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalItems > 0 && (
        <div className="pagination-controls" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '12px 16px', 
          background: 'rgba(255, 255, 255, 0.03)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.08)', 
          borderRadius: '12px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary, #999)' }}>
            Showing <strong style={{ color: 'var(--text-primary, #fff)' }}>{startIndex + 1}</strong> to <strong style={{ color: 'var(--text-primary, #fff)' }}>{Math.min(endIndex, totalItems)}</strong> of <strong style={{ color: 'var(--text-primary, #fff)' }}>{totalItems}</strong> entries
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Rows Per Page Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '95px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary, #999)' }}>Rows:</span>
              <PremiumSelect
                options={[
                  { id: 5, name: '5' },
                  { id: 10, name: '10' },
                  { id: 20, name: '20' },
                  { id: 50, name: '50' },
                  { id: 100, name: '100' }
                ]}
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                searchable={false}
                icon="fa-solid fa-list-ol"
                style={{ width: '80px' }}
              />
            </div>

            {/* Page Buttons */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentPage(prev => Math.max(prev - 1, 1));
                }}
                disabled={activePage === 1}
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '12px', cursor: activePage === 1 ? 'not-allowed' : 'pointer', opacity: activePage === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <i className="fa-solid fa-chevron-left" style={{ fontSize: '10px' }}></i> Prev
              </button>
              
              {getPageNumbers().map((pageNum, idx) => {
                if (pageNum === '...') {
                  return <span key={`dots-${idx}`} style={{ color: 'var(--text-secondary, #999)', padding: '0 4px', fontSize: '12px' }}>...</span>;
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
                      padding: '5px 12px', 
                      fontSize: '12px', 
                      fontWeight: isActive ? 700 : 500,
                      minWidth: '32px',
                      height: '32px',
                      background: isActive ? 'var(--accent-primary, #e50914)' : 'rgba(255, 255, 255, 0.04)',
                      border: isActive ? '1px solid var(--accent-primary, #e50914)' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: isActive ? '#ffffff' : 'var(--text-primary, #fff)',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 2px 10px rgba(229, 9, 20, 0.4)' : 'none',
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
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '12px', cursor: activePage === totalPages ? 'not-allowed' : 'pointer', opacity: activePage === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Next <i className="fa-solid fa-chevron-right" style={{ fontSize: '10px' }}></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaginatedTable;
