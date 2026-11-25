import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Player from './Player';
import QuizPanel from './QuizPanel';
import CertificatePanel from './CertificatePanel';
import StudyRoomChat from './StudyRoomChat';
import { formatTime } from '../../hooks/useVideoPlayer';
import { findQuizForChapter } from '../../hooks/useVideoQuiz';

// Mock LanguageContext
jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key, fallback) => fallback || key,
    language: 'en'
  })
}));

describe('Video Components & Features Suite', () => {
  describe('formatTime helper', () => {
    test('formats seconds into MM:SS correctly', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(9)).toBe('0:09');
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(300)).toBe('5:00');
      expect(formatTime(3665)).toBe('61:05');
      expect(formatTime(-1)).toBe('0:00');
      expect(formatTime(NaN)).toBe('0:00');
    });
  });

  describe('findQuizForChapter helper', () => {
    test('finds quiz matching chapter_id in courseObj.quizzes', () => {
      const course = {
        id: 10,
        quizzes: [
          { id: 101, chapter_id: 1, title: 'Chapter 1 Quiz' },
          { id: 102, chapter_id: 2, title: 'Chapter 2 Quiz' }
        ]
      };
      const found = findQuizForChapter(2, course);
      expect(found.id).toBe(102);
      expect(found.title).toBe('Chapter 2 Quiz');
    });

    test('finds quiz inside courseObj.chapters', () => {
      const course = {
        id: 10,
        chapters: [
          { id: 1, title: 'Intro', quiz: { id: 201, title: 'Intro Quiz' } },
          { id: 2, title: 'Advanced', quiz: { id: 202, title: 'Advanced Quiz' } }
        ]
      };
      const found = findQuizForChapter(1, course);
      expect(found.id).toBe(201);
      expect(found.title).toBe('Intro Quiz');
    });

    test('returns fallback placeholder if no quiz matches', () => {
      const found = findQuizForChapter(99, null);
      expect(found.chapter_id).toBe(99);
      expect(found.title).toBe('Chapter Quiz');
    });
  });

  describe('Player Component', () => {
    const defaultProps = {
      srcUrl: 'https://example.com/test-video.mp4',
      isPlaying: false,
      currentTime: 15,
      duration: 120,
      volume: 0.8,
      isMuted: false,
      playbackSpeed: 1.0,
      quality: 'Auto',
      isQualitySwitching: false,
      savedPositionText: '',
      subtitlesEnabled: false,
      subtitleLang: 'en',
      showCcMenu: false,
      activeCue: null,
      handlePlayPause: jest.fn(),
      handleMuteToggle: jest.fn(),
      handleSeek: jest.fn(),
      handleFullscreen: jest.fn(),
      userEmail: 'student@example.com'
    };

    test('renders video element and watermark', () => {
      const { container } = render(<Player {...defaultProps} />);
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video.src).toBe('https://example.com/test-video.mp4');
      expect(screen.getByText('student@example.com')).toBeInTheDocument();
    });

    test('triggers handlePlayPause on play button click', () => {
      render(<Player {...defaultProps} isPlaying={false} />);
      const playBtn = screen.getByText('▶');
      fireEvent.click(playBtn);
      expect(defaultProps.handlePlayPause).toHaveBeenCalledTimes(1);
    });

    test('triggers handleSeek on 10s back and forward buttons', () => {
      render(<Player {...defaultProps} />);
      const backBtn = screen.getByText('⏪ 10s');
      fireEvent.click(backBtn);
      expect(defaultProps.handleSeek).toHaveBeenCalledWith(-10);

      const fwdBtn = screen.getByText('10s ⏩');
      fireEvent.click(fwdBtn);
      expect(defaultProps.handleSeek).toHaveBeenCalledWith(10);
    });

    test('renders active study room pill when activeStudyRoom is set', () => {
      render(<Player {...defaultProps} activeStudyRoom={{ roomId: 'ROOM-44' }} studyRoomMembers={['u1', 'u2']} />);
      expect(screen.getByText('ROOM-44')).toBeInTheDocument();
      expect(screen.getByText('(2 online)')).toBeInTheDocument();
    });
  });

  describe('QuizPanel Component', () => {
    test('renders nothing when quizModal.show is false', () => {
      const { container } = render(<QuizPanel quizModal={{ show: false }} />);
      expect(container.firstChild).toBeNull();
    });

    test('renders questions and handles answer selection', () => {
      const handleSelectOption = jest.fn();
      const quizModal = {
        show: true,
        title: 'Typescript Fundamentals',
        chapterId: 1,
        questions: [
          {
            id: 1,
            question: 'What is TypeScript?',
            question_type: '1',
            options: ['A typed superset of JavaScript', 'A database', 'An OS', 'A browser']
          }
        ],
        currentIdx: 0,
        userAnswers: {},
        completed: false
      };

      render(
        <QuizPanel
          quizModal={quizModal}
          isCurrentQuestionAnswered={() => false}
          handleSelectOption={handleSelectOption}
          handleTextAnswer={jest.fn()}
          handleNextQuizQuestion={jest.fn()}
          handleSubmitQuiz={jest.fn()}
          handleCloseQuizModal={jest.fn()}
          handleRetakeQuiz={jest.fn()}
        />
      );

      expect(screen.getByText('Typescript Fundamentals')).toBeInTheDocument();
      expect(screen.getByText('What is TypeScript?')).toBeInTheDocument();

      const option1 = screen.getByText(/A typed superset of JavaScript/);
      fireEvent.click(option1);
      expect(handleSelectOption).toHaveBeenCalledWith(0);
    });

    test('renders completed results and provides view certificate button for passing score', () => {
      const onViewCert = jest.fn();
      const quizModal = {
        show: true,
        title: 'Typescript Fundamentals',
        chapterId: 1,
        questions: [{ id: 1, question: 'What is TS?' }],
        currentIdx: 0,
        userAnswers: { 1: 0 },
        completed: true,
        results: {
          score: 1,
          totalQuestions: 1,
          percentage: 100,
          isPassed: true,
          status: 'Passed',
          correctCount: 1,
          wrongCount: 0,
          answers: []
        }
      };

      render(
        <QuizPanel
          quizModal={quizModal}
          isCurrentQuestionAnswered={() => true}
          handleSelectOption={jest.fn()}
          handleTextAnswer={jest.fn()}
          handleNextQuizQuestion={jest.fn()}
          handleSubmitQuiz={jest.fn()}
          handleCloseQuizModal={jest.fn()}
          handleRetakeQuiz={jest.fn()}
          onViewCertificate={onViewCert}
        />
      );

      expect(screen.getByText(/You passed the chapter quiz/i)).toBeInTheDocument();
      expect(screen.getByText(/100%/)).toBeInTheDocument();
      const certBtn = screen.getByText(/View Certificate ➔/);
      expect(certBtn).toBeInTheDocument();
      fireEvent.click(certBtn);
      expect(onViewCert).toHaveBeenCalledTimes(1);
    });
  });

  describe('CertificatePanel Component', () => {
    const certificate = {
      id: 'cert_1',
      title: 'Full Stack Web Development',
      issuer: 'XLurn Learning Academy',
      issueDate: '24 Nov 2026',
      credentialId: 'CERT-FSW-2026-9876',
      score: '95%',
      badge: '🏆',
      learnerName: 'Alex Doe',
      verified: true
    };

    test('returns null when isOpen is false', () => {
      const { container } = render(
        <CertificatePanel certificate={certificate} isOpen={false} onClose={jest.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    test('renders certificate details when isOpen is true', () => {
      const onClose = jest.fn();
      const onViewAll = jest.fn();

      render(
        <CertificatePanel
          certificate={certificate}
          isOpen={true}
          onClose={onClose}
          onViewAllCertificates={onViewAll}
        />
      );

      expect(screen.getByText('Official Course Certificate')).toBeInTheDocument();
      expect(screen.getByText('Alex Doe')).toBeInTheDocument();
      expect(screen.getByText('Full Stack Web Development')).toBeInTheDocument();
      expect(screen.getByText('CERT-FSW-2026-9876')).toBeInTheDocument();

      const closeBtn = screen.getByText('Close');
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);

      const viewAllBtn = screen.getByText('Go to My Certificates ➔');
      fireEvent.click(viewAllBtn);
      expect(onViewAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('StudyRoomChat Component', () => {
    test('renders drawer when showStudyRoomDrawer is true and room exists', () => {
      const activeStudyRoom = {
        roomId: 'SYNC-88',
        title: 'Math Study Group'
      };
      const messages = [
        { id: '1', sender: 'Alice', text: 'Hey everyone!', timestamp: '12:00 PM' }
      ];

      render(
        <StudyRoomChat
          activeStudyRoom={activeStudyRoom}
          showStudyRoomDrawer={true}
          setShowStudyRoomDrawer={jest.fn()}
          showStudyRoomModal={false}
          setShowStudyRoomModal={jest.fn()}
          studyRoomMessages={messages}
          studyRoomMembers={[{ id: '1', username: 'Alice' }]}
          studyInputMessage=""
          setStudyInputMessage={jest.fn()}
          studyJoinCodeInput=""
          setStudyJoinCodeInput={jest.fn()}
          studyCreatingRoom={false}
          studyInviteCopied={false}
          handleSendStudyMessage={jest.fn()}
          handleLeaveStudyRoom={jest.fn()}
          handleCreateWatchPartyNow={jest.fn()}
          handleJoinWatchPartyByCode={jest.fn()}
          handleCopyStudyInvite={jest.fn()}
        />
      );

      expect(screen.getByText('Math Study Group')).toBeInTheDocument();
      expect(screen.getByText('SYNC-88')).toBeInTheDocument();
      expect(screen.getByText('Hey everyone!')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });
});
