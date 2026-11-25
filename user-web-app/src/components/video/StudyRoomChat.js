import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const StudyRoomChat = ({
  activeStudyRoom,
  showStudyRoomDrawer,
  setShowStudyRoomDrawer,
  showStudyRoomModal,
  setShowStudyRoomModal,
  studyRoomMessages,
  studyRoomMembers,
  studyInputMessage,
  setStudyInputMessage,
  studyJoinCodeInput,
  setStudyJoinCodeInput,
  studyCreatingRoom,
  studyInviteCopied,
  handleSendStudyMessage,
  handleLeaveStudyRoom,
  handleCreateWatchPartyNow,
  handleJoinWatchPartyByCode,
  handleCopyStudyInvite,
  onExploreHub
}) => {
  const { t } = useLanguage();

  return (
    <>
      {/* ----------------------------------------------------
          LIVE STUDY ROOM CHAT & SYNC DRAWER
          ---------------------------------------------------- */}
      {showStudyRoomDrawer && activeStudyRoom && (
        <div style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          width: '380px',
          height: '560px',
          maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 100px)',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          borderRadius: '16px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.75), 0 0 20px rgba(99, 102, 241, 0.25)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          overflow: 'hidden'
        }}>
          {/* Drawer Header */}
          <div style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(16, 185, 129, 0.15))',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>👥</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{activeStudyRoom.title || t('studyRooms.liveDrawerTitle', 'Virtual Study Room')}</span>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Code: <strong style={{ color: '#a5b4fc', letterSpacing: '0.5px' }}>{activeStudyRoom.roomId}</strong></span>
                  <button 
                    onClick={handleCopyStudyInvite}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: studyInviteCopied ? '#34d399' : '#818cf8',
                      cursor: 'pointer',
                      fontSize: '11px',
                      padding: 0,
                      fontWeight: 600
                    }}
                  >
                    {studyInviteCopied ? '✓ Copied' : '📋 Copy Link'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setShowStudyRoomDrawer(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  color: '#94a3b8',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Minimize Drawer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Sync status strip */}
          <div style={{
            padding: '6px 14px',
            background: 'rgba(99, 102, 241, 0.12)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#c7d2fe'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ animation: 'spinPulse 2s linear infinite' }}>🔄</span>
              <span>Real-Time Playback Synchronized</span>
            </div>
            <button
              onClick={handleLeaveStudyRoom}
              style={{
                background: 'none',
                border: 'none',
                color: '#f87171',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 4px'
              }}
            >
              Leave Room
            </button>
          </div>

          {/* Active Members Bar */}
          <div style={{
            padding: '8px 14px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Active ({studyRoomMembers.length}):</span>
            {studyRoomMembers.map((m, idx) => (
              <span 
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: '#e2e8f0'
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                {m.username || 'Learner'}
              </span>
            ))}
          </div>

          {/* Chat Messages Stream */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {studyRoomMessages.length === 0 ? (
              <div style={{
                margin: 'auto',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '12px',
                padding: '20px'
              }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>💬</div>
                No messages yet. Ask a question or share a note!
              </div>
            ) : (
              studyRoomMessages.map((msg, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: msg.isSystem ? 'center' : 'flex-start',
                    maxWidth: msg.isSystem ? '90%' : '85%'
                  }}
                >
                  {!msg.isSystem && (
                    <div style={{
                      fontSize: '10px',
                      color: '#a5b4fc',
                      fontWeight: 600,
                      marginBottom: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>{msg.senderName || 'Peer'}</span>
                      <span style={{ color: '#64748b' }}>
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  )}

                  <div style={{
                    padding: msg.isSystem ? '4px 10px' : '8px 12px',
                    borderRadius: msg.isSystem ? '12px' : '10px',
                    background: msg.isSystem 
                      ? 'rgba(99, 102, 241, 0.15)' 
                      : 'rgba(255, 255, 255, 0.08)',
                    border: msg.isSystem ? '1px dashed rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                    color: msg.isSystem ? '#c7d2fe' : '#f1f5f9',
                    fontSize: msg.isSystem ? '11px' : '12px',
                    lineHeight: '1.4',
                    wordBreak: 'break-word',
                    textAlign: msg.isSystem ? 'center' : 'left'
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Doubt & Reaction Chips */}
          <div style={{
            padding: '6px 12px',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            background: 'rgba(0, 0, 0, 0.35)',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            {[
              { label: '🤔 Confused', text: 'Could you replay that part? Confused on that step!' },
              { label: '💡 Understood', text: 'Understood now, great explanation!' },
              { label: '⏸️ Hold on', text: 'Can we pause for 30s to take notes?' },
              { label: '🔥 Great lesson', text: 'Awesome chapter! Very clear.' }
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendStudyMessage(chip.text)}
                style={{
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '3px 8px',
                  color: '#cbd5e1',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Chat Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendStudyMessage();
            }}
            style={{
              padding: '10px 12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(15, 23, 42, 0.98)',
              display: 'flex',
              gap: '8px'
            }}
          >
            <input
              type="text"
              value={studyInputMessage}
              onChange={(e) => setStudyInputMessage(e.target.value)}
              placeholder={t('studyRooms.typeMessage', 'Ask a doubt or message...')}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '12px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={!studyInputMessage.trim()}
              style={{
                background: studyInputMessage.trim() ? '#4f46e5' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: studyInputMessage.trim() ? 'pointer' : 'default',
                transition: 'background 0.2s ease'
              }}
            >
              {t('studyRooms.send', 'Send')}
            </button>
          </form>
        </div>
      )}

      {/* ----------------------------------------------------
          STUDY TOGETHER LAUNCH MODAL (Instant Host / Join)
          ---------------------------------------------------- */}
      {showStudyRoomModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-secondary, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(16, 185, 129, 0.08))'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>👥</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--text-primary, #0f172a)', fontWeight: 700 }}>
                    {t('studyRooms.modalTitle', 'Virtual Study Room & Watch Party')}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                    Watch together in real-time sync with friends
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStudyRoomModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  color: 'var(--text-secondary, #94a3b8)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '50%'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Option 1: Instant Host */}
              <div style={{
                padding: '18px 20px',
                borderRadius: '14px',
                background: 'var(--bg-primary, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary, #0f172a)', marginBottom: '4px' }}>
                    🚀 Host Instant Watch Party
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                    Generate a synchronized room for this video and invite friends.
                  </div>
                </div>

                <button
                  onClick={handleCreateWatchPartyNow}
                  disabled={studyCreatingRoom}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: studyCreatingRoom ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                  }}
                >
                  {studyCreatingRoom ? 'Creating...' : 'Host Room'}
                </button>
              </div>

              {/* Option 2: Join with Code */}
              <div style={{
                padding: '18px 20px',
                borderRadius: '14px',
                background: 'var(--bg-primary, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)'
              }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary, #0f172a)', marginBottom: '4px' }}>
                  🔑 Join with Room Code
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', marginBottom: '14px' }}>
                  Have an invite code from a study partner? Enter it below:
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={studyJoinCodeInput}
                    onChange={(e) => setStudyJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. ROOM-7492"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-secondary, #ffffff)',
                      color: 'var(--text-primary, #0f172a)',
                      fontSize: '14px',
                      fontWeight: 600,
                      letterSpacing: '1px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => handleJoinWatchPartyByCode()}
                    disabled={!studyJoinCodeInput.trim()}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      background: studyJoinCodeInput.trim() ? '#10b981' : 'var(--bg-tertiary, #cbd5e1)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: studyJoinCodeInput.trim() ? 'pointer' : 'default'
                    }}
                  >
                    Join
                  </button>
                </div>
              </div>

              {/* Option 3: Explore Hub */}
              {onExploreHub && (
                <div style={{ textAlign: 'center', paddingTop: '4px' }}>
                  <button
                    onClick={() => {
                      setShowStudyRoomModal(false);
                      onExploreHub();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6366f1',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Browse All Active Public Study Rooms ➔
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudyRoomChat;
