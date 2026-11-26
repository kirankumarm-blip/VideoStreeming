import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import PaginatedTable from '../components/PaginatedTable';
import ThreeDLoader from '../components/ThreeDLoader';
import { useLanguage } from '../context/LanguageContext';
import logger from '../utils/logger';

const UserQuizzes = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResult, setFilterResult] = useState('All');
  const [selectedQuizDetail, setSelectedQuizDetail] = useState(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    fetchQuizHistory();
  }, []);

  const fetchQuizHistory = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const response = await api.dashboard.getUser('getQuizHistory', { formstep: 'getQuizHistory' });

      try {
        const cRes = await api.dashboard.getUser('getAllCourses').catch(() => null);
        let courseList = [];
        if (Array.isArray(cRes)) courseList = cRes;
        else if (Array.isArray(cRes?.data)) courseList = cRes.data;
        else if (Array.isArray(cRes?.json)) courseList = cRes.json;

        if (courseList.length === 0) {
          const dash = await api.dashboard.getUser('Dashboard').catch(() => null);
          const dData = Array.isArray(dash) ? (dash[0]?.json || dash[0] || {}) : (dash?.json || dash || {});
          courseList = dData.your_courses || dData.yourCourses || dData.courses || [];
        }
        if (courseList.length > 0) {
          setCourses(courseList);
        }
      } catch (cErr) {
        logger.warn('Could not load course list for UserQuizzes:', cErr);
      }
      
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
        
        const totalQs = d?.total_questions ?? d?.totalQuestions ?? d?.total ?? d?.total_count ?? (Array.isArray(d?.questions) ? d.questions.length : null);
        const pct = d?.percentage !== undefined ? parseFloat(d.percentage) : (d?.score !== undefined && totalQs ? Math.round((Number(d.score) / totalQs) * 100) : null);

        let scoreStr = 'N/A';
        if (d?.score_display) {
          scoreStr = d.score_display;
        } else if (typeof d?.score === 'string' && d.score.includes('/')) {
          scoreStr = d.score;
        } else if (d?.score !== undefined && totalQs) {
          scoreStr = pct !== null ? `${d.score}/${totalQs} (${pct}%)` : `${d.score}/${totalQs}`;
        } else if (d?.score !== undefined) {
          scoreStr = pct !== null ? `${d.score} (${pct}%)` : `${d.score}`;
        } else if (pct !== null) {
          scoreStr = `${pct}%`;
        }

        const resStr = d?.result_str || (typeof d?.result === 'boolean' ? (d.result ? 'Passed' : 'Failed') : (d?.result || d?.status || (pct !== null ? (pct >= 70 ? 'Passed' : 'Failed') : 'N/A')));
        const attemptVal = d?.attempt || d?.attempt_number || d?.attempts || 1;
        const dateVal = d?.date || d?.created_at || d?.submitted_at || 'N/A';

        const rawCourseId = d?.course_id || d?.courseId || (d?.course && typeof d.course === 'object' ? (d.course.id || d.course.course_id) : null);
        const courseId = rawCourseId || 1;

        const rawChapId = d?.chapter_id || d?.chapterId || (d?.chapter && typeof d.chapter === 'object' ? (d.chapter.id || d.chapter.chapter_id) : null);
        const chapterId = rawChapId || (typeof chapterName === 'string' && chapterName.match(/\d+/) ? parseInt(chapterName.match(/\d+/)[0], 10) : 1);

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
          courseId,
          chapterId,
          raw: d
        };
      });

      setQuizzes(formatted);
    } catch (err) {
      logger.warn("Failed to fetch quiz history from API", err);
      setQuizzes([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const handleRetakeQuiz = (item) => {
    if (!item) return;

    // Resolve matching course object if available from fetched courses
    const matchedCourse = courses.find(c => 
      String(c.id || c.course_id) === String(item.courseId) ||
      (c.title && item.course && String(c.title).toLowerCase() === String(item.course).toLowerCase()) ||
      (c.course_name && item.course && String(c.course_name).toLowerCase() === String(item.course).toLowerCase())
    ) || (courses.length > 0 ? courses[0] : null);

    const targetCourseId = matchedCourse?.id || matchedCourse?.course_id || item.courseId || 1;
    const targetChapterId = item.chapterId || 1;

    // Navigate to /watch/{courseId} with the chapter selected and retake flag so the quiz opens directly
    navigate(`/watch/${targetCourseId}?chapter=${targetChapterId}&retake=true`, {
      state: {
        course: matchedCourse,
        courseId: targetCourseId,
        chapterId: targetChapterId,
        chapter: targetChapterId,
        retake: true,
        quizId: item.id
      }
    });
  };

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
    { label: t('quiz.colQuiz', 'Quiz'), style: { width: '20%' } },
    { label: t('quiz.colCourse', 'Course'), style: { width: '20%' } },
    { label: t('quiz.colChapter', 'Chapter'), style: { width: '12%' } },
    { label: t('quiz.colScore', 'Score'), style: { width: '14%', textAlign: 'right' } },
    { label: t('quiz.colResult', 'Result'), style: { width: '12%' } },
    { label: t('quiz.colAttempt', 'Attempt'), style: { width: '8%', textAlign: 'right' } },
    { label: t('quiz.colDate', 'Date'), style: { width: '18%' } },
    { label: t('quiz.colAction', 'Action'), style: { width: '10%', textAlign: 'center' } }
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
            {isPassed ? `🟢 ${t('quiz.passed', 'Passed')}` : `🔴 ${t('quiz.failed', 'Failed')}`}
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
              👁 {t('quiz.view', 'View')}
            </button>
          ) : (
            <button
              onClick={() => handleRetakeQuiz(item)}
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
              🔄 {t('quiz.retake', 'Retake')}
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="user-quiz-page-container" style={{
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
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📝</span> {t('quiz.title', 'Quiz Performance & History')}
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {t('quiz.subtitle', 'Track your chapter assessment scores, results, and attempts across all enrolled courses.')}
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
          🔄 {t('quiz.refresh', 'Refresh History')}
        </button>
      </div>

      {/* Action & Filter Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px',
        backgroundColor: 'var(--bg-secondary)',
        padding: '14px 16px',
        borderRadius: '16px',
        border: '1px solid var(--border-color)'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
          <input
            type="text"
            placeholder={t('quiz.searchPlaceholder', 'Search quiz, course, chapter...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 14px 9px 36px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--text-secondary)' }}>
            🔍
          </span>
        </div>

        {/* Result Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['All', 'Passed', 'Failed'].map(status => {
            const statusLabel = status === 'Passed' ? `🟢 ${t('quiz.filterPassed', 'Passed')}` : status === 'Failed' ? `🔴 ${t('quiz.filterFailed', 'Failed')}` : t('quiz.filterAll', 'All');
            return (
              <button
                key={status}
                onClick={() => setFilterResult(status)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: filterResult === status ? 700 : 600,
                  border: '1px solid',
                  borderColor: filterResult === status ? 'var(--accent-primary)' : 'var(--border-color)',
                  backgroundColor: filterResult === status ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: filterResult === status ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {statusLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Quiz History Table */}
      {loading ? (
        <ThreeDLoader text="Loading quiz telemetry data..." />
      ) : (
        <div className="user-quiz-card-wrapper" style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <PaginatedTable
            headers={tableHeaders}
            data={filteredQuizzes}
            renderRow={renderQuizRow}
            emptyMessage="No quiz attempts found"
            defaultItemsPerPage={10}
            showSearch={false}
            showStatusFilter={false}
            showExport={true}
            tableStyle={{ minWidth: '680px' }}
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
            {(() => {
              const isPassed = String(selectedQuizDetail.result).toLowerCase() === 'passed';
              return (
                <>
                  <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: isPassed 
                      ? 'linear-gradient(90deg, rgba(16,185,129,0.1), transparent)' 
                      : 'linear-gradient(90deg, rgba(239,68,68,0.1), transparent)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>{isPassed ? '🏆' : '📝'}</span>
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
                      backgroundColor: isPassed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: isPassed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                      <span style={{ fontSize: '36px', display: 'block', marginBottom: '6px' }}>{isPassed ? '🎉' : '⚠️'}</span>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: isPassed ? '#10b981' : '#ef4444' }}>
                        Score: {selectedQuizDetail.score}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Status: {isPassed ? '🟢 Passed' : '🔴 Failed'} on Attempt {selectedQuizDetail.attempt}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{t('quiz.completedOn', 'Completed On:')}</span>
                        <span style={{ fontWeight: 600 }}>{selectedQuizDetail.date}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{t('quiz.attemptCount', 'Total Attempt Count:')}</span>
                        <span style={{ fontWeight: 600 }}>{selectedQuizDetail.attempt}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{t('quiz.rating', 'Performance Rating:')}</span>
                        <span style={{ fontWeight: 600, color: isPassed ? '#10b981' : '#ef4444' }}>
                          {isPassed ? t('quiz.ratingPassed', 'Passed') : t('quiz.ratingNeedsImprovement', 'Needs Improvement')}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-primary)'
            }}>
              {String(selectedQuizDetail.result).toLowerCase() !== 'passed' ? (
                <button
                  onClick={() => {
                    const quizToRetake = selectedQuizDetail;
                    setSelectedQuizDetail(null);
                    handleRetakeQuiz(quizToRetake);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #e50914, #b20710)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(229, 9, 20, 0.3)'
                  }}
                >
                  🔄 {t('quiz.retake', 'Retake Quiz')}
                </button>
              ) : <div />}
              <button
                onClick={() => setSelectedQuizDetail(null)}
                className="btn btn-primary"
                style={{ padding: '8px 24px', fontSize: '13px', borderRadius: '8px' }}
              >
                {t('quiz.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserQuizzes;
