import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import PaginatedTable from '../components/PaginatedTable';
import ThreeDLoader from '../components/ThreeDLoader';

const UserQuizzes = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResult, setFilterResult] = useState('All');
  const [selectedQuizDetail, setSelectedQuizDetail] = useState(null);

  useEffect(() => {
    fetchQuizHistory();
  }, []);

  const fetchQuizHistory = async () => {
    setLoading(true);
    try {
      const response = await api.dashboard.getUser('getQuizHistory', { formstep: 'getQuizHistory' });
      
      let rawList = [];
      if (Array.isArray(response)) {
        rawList = response;
      } else if (response?.data && Array.isArray(response.data)) {
        rawList = response.data;
      } else if (response?.json && Array.isArray(response.json)) {
        rawList = response.json;
      }

      // Filter out empty N8N response objects e.g. [{ json: {} }]
      const validRawList = rawList.filter(item => {
        const d = (item && item.json !== undefined) ? item.json : item;
        return d && typeof d === 'object' && Object.keys(d).length > 0 && (d.id || d.quiz || d.quiz_id || d.quiz_title || d.title || d.score !== undefined);
      });

      const formatted = validRawList.map((item, idx) => {
        let d = (item && item.json !== undefined) ? item.json : item;

        let quizTitle = 'Quiz';
        if (d?.quiz && typeof d.quiz === 'object') {
          quizTitle = d.quiz.title || d.quiz.quiz || d.quiz.name || quizTitle;
          d = { ...d.quiz, ...d };
        } else if (d?.quiz && typeof d.quiz === 'string') {
          quizTitle = d.quiz;
        } else if (d?.quiz_title || d?.title || d?.quiz_name) {
          quizTitle = d.quiz_title || d.title || d.quiz_name;
        }

        const courseName = d?.course || d?.course_title || d?.course_name || 'N/A';
        const chapterName = d?.chapter || d?.chapter_name || d?.chapter_title || (d?.chapter_id ? `Chapter ${d.chapter_id}` : 'N/A');
        
        let scoreStr = 'N/A';
        if (d?.score_display) {
          scoreStr = d.score_display;
        } else if (typeof d?.score === 'string' && d.score.includes('/')) {
          scoreStr = d.score;
        } else if (d?.score !== undefined) {
          const totalQs = d.total_questions || d.total || (d.percentage ? 10 : 10);
          const pctVal = d.percentage !== undefined ? parseFloat(d.percentage) : Math.round((d.score / totalQs) * 100);
          scoreStr = `${d.score}/${totalQs} (${pctVal}%)`;
        }

        const pct = d?.percentage !== undefined ? parseFloat(d.percentage) : 0;
        const resStr = d?.result || d?.status || (pct >= 70 ? 'Passed' : 'Failed');
        const attemptVal = d?.attempt || d?.attempt_number || d?.attempts || 1;
        const dateVal = d?.date || d?.created_at || d?.submitted_at || 'N/A';

        return {
          id: d?.id || d?.quiz_id || idx + 1,
          quiz: quizTitle,
          course: courseName,
          chapter: chapterName,
          score: scoreStr,
          percentage: pct,
          result: resStr,
          attempt: attemptVal,
          date: dateVal,
          courseId: d?.course_id || 1,
          chapterId: d?.chapter_id || 1
        };
      });

      setQuizzes(formatted);
    } catch (err) {
      console.warn("Failed to fetch quiz history from API", err);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  const getFallbackQuizHistory = () => [
    {
      id: 1,
      quiz: 'Data Types Quiz',
      course: 'TypeScript Basics',
      chapter: 'Chapter 1',
      score: '8/10 (80%)',
      percentage: 80,
      result: 'Passed',
      attempt: 1,
      date: '07 Aug 2026, 2:15 PM',
      courseId: 1,
      chapterId: 1
    },
    {
      id: 2,
      quiz: 'Array Quiz',
      course: 'TypeScript Basics',
      chapter: 'Chapter 2',
      score: '6/10 (60%)',
      percentage: 60,
      result: 'Failed',
      attempt: 1,
      date: '08 Aug 2026, 10:30 AM',
      courseId: 1,
      chapterId: 2
    },
    {
      id: 3,
      quiz: 'Functions Quiz',
      course: 'TypeScript Basics',
      chapter: 'Chapter 3',
      score: '10/10 (100%)',
      percentage: 100,
      result: 'Passed',
      attempt: 2,
      date: '09 Aug 2026, 4:45 PM',
      courseId: 1,
      chapterId: 3
    },
    {
      id: 4,
      quiz: 'Interfaces Quiz',
      course: 'Advanced TypeScript',
      chapter: 'Chapter 1',
      score: '9/10 (90%)',
      percentage: 90,
      result: 'Passed',
      attempt: 1,
      date: '10 Aug 2026, 9:20 AM',
      courseId: 2,
      chapterId: 1
    }
  ];

  const filteredQuizzes = quizzes.filter(q => {
    const matchesSearch = 
      q.quiz.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.chapter.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesResult = 
      filterResult === 'All' ? true :
      filterResult === 'Passed' ? q.result.toLowerCase() === 'passed' :
      filterResult === 'Failed' ? q.result.toLowerCase() === 'failed' : true;

    return matchesSearch && matchesResult;
  });

  const tableHeaders = [
    { label: 'Quiz', style: { width: '20%' } },
    { label: 'Course', style: { width: '20%' } },
    { label: 'Chapter', style: { width: '12%' } },
    { label: 'Score', style: { width: '14%', textAlign: 'right' } },
    { label: 'Result', style: { width: '12%' } },
    { label: 'Attempt', style: { width: '8%', textAlign: 'right' } },
    { label: 'Date', style: { width: '18%' } },
    { label: 'Action', style: { width: '10%', textAlign: 'center' } }
  ];

  const renderQuizRow = (item, index) => {
    const isPassed = item.result.toLowerCase() === 'passed';

    return (
      <tr key={item.id || index} style={{ transition: 'background 0.2s' }} className="table-row-hover">
        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>📝</span>
            <span>{item.quiz}</span>
          </div>
        </td>

        <td style={{ color: 'var(--text-secondary)' }}>{item.course}</td>
        <td style={{ color: 'var(--text-secondary)' }}>{item.chapter}</td>

        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
          {item.score}
        </td>

        <td>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 700,
            backgroundColor: isPassed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: isPassed ? '#10b981' : '#ef4444',
            border: `1px solid ${isPassed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            {isPassed ? '🟢 Passed' : '🔴 Failed'}
          </span>
        </td>

        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {item.attempt}
        </td>

        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {item.date}
        </td>

        <td style={{ textAlign: 'center' }}>
          {isPassed ? (
            <button
              onClick={() => setSelectedQuizDetail(item)}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              👁 View
            </button>
          ) : (
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'linear-gradient(135deg, #e50914, #b20710)',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(229, 9, 20, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              🔄 Retake
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div style={{
      padding: '32px 40px',
      height: '100%',
      overflowY: 'auto',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)'
    }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📝</span> Quiz Performance & History
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Track your chapter assessment scores, results, and attempts across all enrolled courses.
          </p>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchQuizHistory}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🔄 Refresh History
        </button>
      </div>

      {/* Action & Filter Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px',
        backgroundColor: 'var(--bg-secondary)',
        padding: '16px 20px',
        borderRadius: '16px',
        border: '1px solid var(--border-color)'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            placeholder="Search quiz, course, chapter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 14px 8px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--text-secondary)' }}>
            🔍
          </span>
        </div>

        {/* Result Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['All', 'Passed', 'Failed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterResult(status)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: filterResult === status ? 700 : 500,
                border: '1px solid',
                borderColor: filterResult === status ? 'var(--accent-primary)' : 'var(--border-color)',
                backgroundColor: filterResult === status ? 'var(--accent-primary)' : 'transparent',
                color: filterResult === status ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {status === 'Passed' ? '🟢 Passed' : status === 'Failed' ? '🔴 Failed' : 'All Quizzes'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Quiz History Table */}
      {loading ? (
        <ThreeDLoader text="Loading quiz telemetry data..." />
      ) : (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
        }}>
          <PaginatedTable
            headers={tableHeaders}
            data={filteredQuizzes}
            renderRow={renderQuizRow}
            emptyMessage="No data available"
            defaultItemsPerPage={10}
          />
        </div>
      )}

      {/* Quiz Detail Modal */}
      {selectedQuizDetail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '20px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(90deg, rgba(16,185,129,0.1), transparent)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🏆</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{selectedQuizDetail.quiz}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {selectedQuizDetail.course} • {selectedQuizDetail.chapter}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedQuizDetail(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                textAlign: 'center',
                padding: '20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <span style={{ fontSize: '36px', display: 'block', marginBottom: '6px' }}>🎉</span>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981' }}>
                  Score: {selectedQuizDetail.score}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Status: 🟢 Passed on Attempt {selectedQuizDetail.attempt}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Completed On:</span>
                  <span style={{ fontWeight: 600 }}>{selectedQuizDetail.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Attempt Count:</span>
                  <span style={{ fontWeight: 600 }}>{selectedQuizDetail.attempt}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Performance Rating:</span>
                  <span style={{ fontWeight: 600, color: '#10b981' }}>Excellent</span>
                </div>
              </div>
            </div>

            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-color)',
              textAlign: 'right',
              backgroundColor: 'var(--bg-primary)'
            }}>
              <button
                onClick={() => setSelectedQuizDetail(null)}
                className="btn btn-primary"
                style={{ padding: '8px 24px', fontSize: '13px', borderRadius: '8px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserQuizzes;
