import React, { useState } from 'react';

const PaginatedTable = ({ 
  headers, 
  data = [], 
  renderRow, 
  emptyMessage = "No records found", 
  defaultItemsPerPage = 5,
  tableStyle = {},
  tableClassName = "data-table"
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const activePage = currentPage > totalPages ? 1 : (currentPage < 1 ? 1 : currentPage);

  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  // Helper to build list of page numbers to render
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
    <div className="paginated-table-wrapper" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="table-container" style={{ overflowX: 'auto', width: '100%' }}>
        <table className={tableClassName} style={{ width: '100%', borderCollapse: 'collapse', ...tableStyle }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={typeof h === 'object' ? h.style : {}} className={typeof h === 'object' ? h.className : ''}>
                  {typeof h === 'object' ? h.label : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((item, index) => renderRow(item, startIndex + index))
            ) : (
              <tr>
                <td colSpan={headers.length} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <span style={{ fontSize: '28px' }}>📂</span>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data.length > 0 && (
        <div className="pagination-controls" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: '16px', 
          padding: '12px 16px', 
          background: 'rgba(255, 255, 255, 0.02)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '8px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{startIndex + 1}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{Math.min(endIndex, data.length)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{data.length}</strong> items
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Rows per page:</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {[5, 10, 20, 50].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

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
                style={{ padding: '4px 8px', fontSize: '12px', cursor: activePage === 1 ? 'not-allowed' : 'pointer', opacity: activePage === 1 ? 0.5 : 1 }}
              >
                ‹ Prev
              </button>
              
              {getPageNumbers().map((pageNum, idx) => {
                if (pageNum === '...') {
                  return <span key={`dots-${idx}`} style={{ color: 'var(--text-secondary)', padding: '0 4px', fontSize: '12px' }}>...</span>;
                }
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
                      padding: '4px 10px', 
                      fontSize: '12px', 
                      fontWeight: activePage === pageNum ? 700 : 500,
                      minWidth: '28px',
                      background: activePage === pageNum ? 'var(--accent-primary)' : 'none',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer'
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
                style={{ padding: '4px 8px', fontSize: '12px', cursor: activePage === totalPages ? 'not-allowed' : 'pointer', opacity: activePage === totalPages ? 0.5 : 1 }}
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaginatedTable;
