import React from 'react';
import ReactDOM from 'react-dom';

const QuizPanel = ({
  quizModal,
  isCurrentQuestionAnswered,
  handleSelectOption,
  handleTextAnswer,
  handleNextQuizQuestion,
  handleSubmitQuiz,
  handleCloseQuizModal,
  handleRetakeQuiz,
  onViewCertificate
}) => {
  if (!quizModal || !quizModal.show) return null;

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '640px',
        backgroundColor: 'var(--bg-secondary, #181824)',
        border: '1px solid var(--border-color, #2e2e3e)',
        borderRadius: '20px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
        animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Quiz Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color, #2e2e3e)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, rgba(229,9,20,0.12), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '26px' }}>📝</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
                {quizModal.title}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary, #a1a1aa)' }}>
                Chapter {quizModal.chapterId} Quiz Assessment
              </span>
            </div>
          </div>

          {!quizModal.completed && (
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(229, 9, 20, 0.15)',
              color: '#e50914',
              border: '1px solid rgba(229, 9, 20, 0.3)'
            }}>
              Question {quizModal.currentIdx + 1} of {quizModal.questions.length}
            </span>
          )}
        </div>

        {/* Quiz Progress Bar */}
        {!quizModal.completed && (
          <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-tertiary, #2a2a38)' }}>
            <div style={{
              width: `${((quizModal.currentIdx + 1) / quizModal.questions.length) * 100}%`,
              height: '100%',
              backgroundColor: '#e50914',
              transition: 'width 0.3s ease'
            }} />
          </div>
        )}

        {/* Quiz Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {!quizModal.completed ? (() => {
            const currentQ = quizModal.questions[quizModal.currentIdx];
            if (!currentQ) return null;
            const selectedOpt = quizModal.userAnswers[currentQ.id];
            const qType = String(currentQ.question_type || currentQ.questionType || 1);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Question Statement */}
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--text-primary, #ffffff)',
                  margin: 0,
                  lineHeight: '1.5'
                }}>
                  {currentQ.question}
                </h4>

                {/* Question Input / Options based on question_type */}
                {qType === '3' ? (
                  /* Question Type 3: Fill in the Blanks Input */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #a1a1aa)' }}>
                      ✏️ Type your answer below:
                    </label>
                    <input
                      type="text"
                      value={selectedOpt || ''}
                      onKeyDown={(e) => {
                        if (e.key === ' ' && (!e.currentTarget.value || e.currentTarget.selectionStart === 0)) {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => handleTextAnswer(e.target.value)}
                      placeholder="Enter your answer here..."
                      style={{
                        width: '100%',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--bg-primary, #12121a)',
                        border: `1.5px solid ${String(selectedOpt || '').trim() ? '#e50914' : 'var(--border-color, #2e2e3e)'}`,
                        color: 'var(--text-primary, #ffffff)',
                        fontSize: '15px',
                        fontWeight: 500,
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: String(selectedOpt || '').trim() ? '0 4px 14px rgba(229, 9, 20, 0.15)' : 'none'
                      }}
                    />
                  </div>
                ) : (
                  /* Question Types 1 (MCQ) & 2 (True / False) Options */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(() => {
                      const tfDefaults = ["True", "False"];
                      const optionsToRender = (qType === '2' && (!currentQ.options || currentQ.options.length < 2))
                        ? tfDefaults
                        : (currentQ.options || []);

                      return optionsToRender.map((opt, optIdx) => {
                        const isSelected = selectedOpt === optIdx;
                        const optText = typeof opt === 'object' ? (opt.text || opt.option_text || JSON.stringify(opt)) : String(opt);

                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleSelectOption(optIdx)}
                            style={{
                              padding: '14px 18px',
                              borderRadius: '12px',
                              backgroundColor: isSelected ? 'rgba(229, 9, 20, 0.14)' : 'var(--bg-primary, #12121a)',
                              border: `1.5px solid ${isSelected ? '#e50914' : 'var(--border-color, #2e2e3e)'}`,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px',
                              transition: 'all 0.2s ease',
                              boxShadow: isSelected ? '0 4px 14px rgba(229, 9, 20, 0.25)' : 'none'
                            }}
                          >
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              border: `2px solid ${isSelected ? '#e50914' : '#666'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {isSelected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#e50914' }} />}
                            </div>

                            <span style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: isSelected ? '#e50914' : 'var(--text-secondary, #a1a1aa)'
                            }}>
                              {String.fromCharCode(65 + optIdx)}.
                            </span>

                            <span style={{
                              fontSize: '14px',
                              color: isSelected ? 'var(--text-primary, #ffffff)' : 'var(--text-secondary, #d1d5db)',
                              fontWeight: isSelected ? 600 : 400
                            }}>
                              {optText}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            );
          })() : (
            /* Quiz Results View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Score Banner */}
              <div style={{
                textAlign: 'center',
                padding: '24px',
                borderRadius: '16px',
                background: quizModal.results?.isPassed 
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
                border: `1px solid ${quizModal.results?.isPassed ? '#10b981' : '#ef4444'}`
              }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '8px' }}>
                  {quizModal.results?.isPassed ? '🎉' : '📊'}
                </span>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #ffffff)' }}>
                  Score: {quizModal.results?.score} / {quizModal.results?.totalQuestions} ({quizModal.results?.percentage}%)
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: quizModal.results?.isPassed ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                  {quizModal.results?.isPassed ? 'Congratulations! You passed the chapter quiz.' : 'Quiz completed. Review correct answers below.'}
                </p>
                {quizModal.results?.isPassed && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '32px' }}>📜</span>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
                          Official Completion Certificate Generated!
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
                          Credential ID: <code style={{ color: '#10b981', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>{quizModal.results?.credentialId || 'CERT-VERIFIED-2026'}</code>
                        </div>
                      </div>
                    </div>
                    {onViewCertificate && (
                      <button
                        onClick={onViewCertificate}
                        style={{
                          padding: '9px 18px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '13px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                        }}
                      >
                        View Certificate ➔
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Detailed Question Review */}
              <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary, #ffffff)' }}>
                Detailed Answer Breakdown
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(quizModal.results?.answers || []).map((ans, idx) => (
                  <div key={idx} style={{
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: ans.is_correct ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${ans.is_correct ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #ffffff)' }}>
                        {idx + 1}. {ans.question_text || ans.question}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '2px 10px',
                        borderRadius: '6px',
                        backgroundColor: ans.is_correct ? '#10b981' : '#ef4444',
                        color: '#ffffff',
                        flexShrink: 0
                      }}>
                        {ans.is_correct ? '✔ Correct' : '❌ Wrong'}
                      </span>
                    </div>

                    {String(ans.question_type) === '3' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                        <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: ans.is_correct ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${ans.is_correct ? '#10b981' : '#ef4444'}` }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Your Answer: </span>
                          <strong style={{ color: ans.is_correct ? '#10b981' : '#ef4444' }}>{ans.selected_text || ans.user_answer || '(No answer provided)'}</strong>
                        </div>
                        {!ans.is_correct && (
                          <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Correct Answer: </span>
                            <strong style={{ color: '#10b981' }}>{ans.correct_answer || ans.correct_text}</strong>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                        {(ans.options || []).map((opt, oIdx) => {
                          const optId = typeof opt === 'object' ? (opt.option_id ?? opt.id) : null;
                          const optText = typeof opt === 'object' ? (opt.option_text || opt.text || opt.label || JSON.stringify(opt)) : String(opt);

                          let isCorrectChoice = false;
                          if (typeof opt?.is_correct === 'boolean') {
                            isCorrectChoice = opt.is_correct;
                          } else if (ans.correct_option_id !== undefined && ans.correct_option_id !== null && optId !== null) {
                            isCorrectChoice = String(optId) === String(ans.correct_option_id);
                          } else if (ans.correct_answer) {
                            isCorrectChoice = String(optText).trim().toLowerCase() === String(ans.correct_answer).trim().toLowerCase();
                          } else if (ans.correct_text) {
                            isCorrectChoice = String(optText).trim().toLowerCase() === String(ans.correct_text).trim().toLowerCase();
                          } else if (typeof ans.correct_option === 'number' && optId === null) {
                            isCorrectChoice = ans.correct_option === oIdx;
                          }

                          let isUserChoice = false;
                          if (typeof opt?.is_selected === 'boolean') {
                            isUserChoice = opt.is_selected;
                          } else if (ans.selected_option_id !== undefined && ans.selected_option_id !== null && optId !== null) {
                            isUserChoice = String(optId) === String(ans.selected_option_id);
                          } else if (ans.selected_text) {
                            isUserChoice = String(optText).trim().toLowerCase() === String(ans.selected_text).trim().toLowerCase();
                          } else if (typeof ans.selected_option === 'number' && optId === null) {
                            isUserChoice = ans.selected_option === oIdx;
                          }

                          let bg = 'transparent';
                          let color = 'var(--text-secondary, #a1a1aa)';
                          let border = '1px transparent solid';

                          if (isCorrectChoice) {
                            bg = 'rgba(16, 185, 129, 0.2)';
                            color = '#10b981';
                            border = '1px solid #10b981';
                          } else if (isUserChoice && !ans.is_correct) {
                            bg = 'rgba(239, 68, 68, 0.2)';
                            color = '#ef4444';
                            border = '1px solid #ef4444';
                          }

                          return (
                            <div key={oIdx} style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              backgroundColor: bg,
                              color: color,
                              border: border,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontWeight: (isUserChoice || isCorrectChoice) ? 600 : 400
                            }}>
                              <span>{String.fromCharCode(65 + oIdx)}. {optText}</span>
                              {isCorrectChoice && <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>[Correct Answer]</span>}
                              {isUserChoice && !isCorrectChoice && <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>[Your Choice]</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quiz Modal Footer Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-color, #2e2e3e)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-primary, #12121a)'
        }}>
          {!quizModal.completed ? (
            <>
              <button
                onClick={handleCloseQuizModal}
                className="btn btn-secondary"
                style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>

              {quizModal.currentIdx < quizModal.questions.length - 1 ? (
                <button
                  onClick={handleNextQuizQuestion}
                  disabled={!isCurrentQuestionAnswered()}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 24px',
                    fontSize: '13px',
                    backgroundColor: '#e50914',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: !isCurrentQuestionAnswered() ? 'not-allowed' : 'pointer',
                    opacity: !isCurrentQuestionAnswered() ? 0.5 : 1
                  }}
                >
                  Next ➔
                </button>
              ) : (
                <button
                  onClick={handleSubmitQuiz}
                  disabled={quizModal.isSubmitting || !isCurrentQuestionAnswered()}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 24px',
                    fontSize: '13px',
                    backgroundColor: '#10b981',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: (quizModal.isSubmitting || !isCurrentQuestionAnswered()) ? 'not-allowed' : 'pointer',
                    opacity: (quizModal.isSubmitting || !isCurrentQuestionAnswered()) ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {quizModal.isSubmitting ? 'Submitting...' : 'Submit Quiz 🚀'}
                </button>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: '12px' }}>
              <button
                onClick={handleRetakeQuiz}
                className="btn btn-secondary"
                style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}
              >
                🔄 Retake Quiz
              </button>
              {quizModal.results?.percentage >= 70 && onViewCertificate && (
                <button
                  onClick={onViewCertificate}
                  style={{
                    padding: '8px 20px',
                    fontSize: '13px',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.4)'
                  }}
                >
                  📜 View Certificate
                </button>
              )}
              <button
                onClick={handleCloseQuizModal}
                className="btn btn-primary"
                style={{ padding: '8px 24px', fontSize: '13px', backgroundColor: '#e50914', border: 'none', color: '#ffffff', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Continue Course
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default QuizPanel;
