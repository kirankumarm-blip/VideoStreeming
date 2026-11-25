import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export const getFallbackQuestions = (quizTitle, chapId) => {
  const titleLower = (quizTitle || '').toLowerCase();
  if (String(chapId) === '1' || titleLower.includes('data types') || titleLower.includes('type script')) {
    return [
      {
        id: 1,
        question: "What is TypeScript?",
        options: ["A typed superset of JavaScript", "A relational database engine", "A CSS preprocessor framework", "A web server runtime"],
        correctAnswer: 0
      },
      {
        id: 2,
        question: "Which of the following is a primitive data type in TypeScript?",
        options: ["string", "Array", "Object", "Function"],
        correctAnswer: 0
      },
      {
        id: 3,
        question: "What keyword is used to declare a variable with an explicit type?",
        options: ["const name: string", "var name = string", "type name = string", "dim name as string"],
        correctAnswer: 0
      }
    ];
  } else {
    return [
      {
        id: 1,
        question: "What method is used to add an element to the end of an Array?",
        options: ["push()", "pop()", "shift()", "unshift()"],
        correctAnswer: 0
      },
      {
        id: 2,
        question: "How do you access the first element of an array 'arr'?",
        options: ["arr[0]", "arr[1]", "arr.first()", "arr.get(0)"],
        correctAnswer: 0
      },
      {
        id: 3,
        question: "What does Array.prototype.length return?",
        options: ["Total number of elements", "Memory size in bytes", "Array index limit", "Last element value"],
        correctAnswer: 0
      }
    ];
  }
};

export const findQuizForChapter = (chapId, courseObj) => {
  if (!courseObj) {
    return { id: chapId || 1, title: `Chapter Quiz`, chapter_id: chapId || 1 };
  }
  
  if (courseObj.quiz && typeof courseObj.quiz === 'object') return courseObj.quiz;

  if (courseObj.quizzes && !Array.isArray(courseObj.quizzes) && typeof courseObj.quizzes === 'object') {
    return courseObj.quizzes;
  }

  if (Array.isArray(courseObj.quizzes) && courseObj.quizzes.length > 0) {
    const found = courseObj.quizzes.find(q => 
      q && (
        String(q.chapter_id || q.chapterId || q.chapter || '') === String(chapId) ||
        String(q.course_id || q.courseId || '') === String(courseObj.id || courseObj.course_id || '')
      )
    );
    if (found) return found;

    if (courseObj.quizzes.length === 1) {
      return courseObj.quizzes[0];
    }
  }

  if (Array.isArray(courseObj.chapters) && courseObj.chapters.length > 0) {
    for (let i = 0; i < courseObj.chapters.length; i++) {
      const chap = courseObj.chapters[i];
      const cId = chap.id || chap.chapter_id || chap.chapterId;
      if (String(cId) === String(chapId) || courseObj.chapters.length === 1) {
        if (chap.quiz) return chap.quiz;
        if (Array.isArray(chap.quizzes) && chap.quizzes.length > 0) return chap.quizzes[0];
        if (chap.quiz_id || chap.quizId) return { id: chap.quiz_id || chap.quizId, title: chap.title || `Chapter Quiz` };
      }
    }
  }

  if (Array.isArray(courseObj.quizzes) && courseObj.quizzes.length > 0) {
    let idx = parseInt(chapId, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= courseObj.quizzes.length) {
      idx = 0;
    }
    return courseObj.quizzes[idx];
  }

  return {
    id: courseObj.quiz_id || courseObj.quizId || chapId || 1,
    chapter_id: chapId || 1,
    title: `Chapter Quiz`
  };
};

export const extractQuizFromResponse = (res, quizInfo, chapId) => {
  let actualQuiz = null;

  if (Array.isArray(res) && res.length > 0) {
    const item = res[0];
    if (item?.json?.quiz) actualQuiz = item.json.quiz;
    else if (item?.json?.questions) actualQuiz = item.json;
    else if (item?.json?.quizzes && Array.isArray(item.json.quizzes) && item.json.quizzes.length > 0) actualQuiz = item.json.quizzes[0];
    else if (item?.quiz) actualQuiz = item.quiz;
    else if (item?.questions) actualQuiz = item;
    else if (item?.quizzes && Array.isArray(item.quizzes) && item.quizzes.length > 0) actualQuiz = item.quizzes[0];
  } else if (res && typeof res === 'object') {
    if (res.json?.quiz) actualQuiz = res.json.quiz;
    else if (res.json?.questions) actualQuiz = res.json;
    else if (res.json?.quizzes && Array.isArray(res.json.quizzes) && res.json.quizzes.length > 0) actualQuiz = res.json.quizzes[0];
    else if (res.quiz) actualQuiz = res.quiz;
    else if (res.questions) actualQuiz = res;
    else if (res.quizzes && Array.isArray(res.quizzes) && res.quizzes.length > 0) actualQuiz = res.quizzes[0];
  }

  let questions = [];
  let title = quizInfo?.title || `Chapter ${chapId} Quiz`;

  if (actualQuiz) {
    if (Array.isArray(actualQuiz.questions) && actualQuiz.questions.length > 0) {
      questions = actualQuiz.questions;
    }
    if (actualQuiz.title) {
      title = actualQuiz.title;
    }
  }

  if (questions.length === 0 && Array.isArray(quizInfo?.questions) && quizInfo.questions.length > 0) {
    questions = quizInfo.questions;
  }

  if (questions.length === 0) {
    questions = getFallbackQuestions(title, chapId);
  }

  return {
    questions,
    title,
    quizId: actualQuiz?.quiz_id || actualQuiz?.id || quizInfo?.id || chapId
  };
};

export const useVideoQuiz = ({
  authUser,
  video,
  activeCourse,
  locationState,
  retakeParam,
  chapterParam,
  courseParam,
  videoId,
  loading,
  isLessonCompleted,
  isChapterLocked,
  getCourseChapters,
  setCustomAlert,
  onNavigateToNextLesson
}) => {
  const [quizModal, setQuizModal] = useState({
    show: false,
    title: '',
    quizId: 0,
    chapterId: 0,
    courseId: 0,
    questions: [],
    currentIdx: 0,
    userAnswers: {},
    isSubmitting: false,
    completed: false,
    results: null
  });

  const [earnedCertificate, setEarnedCertificate] = useState(null);

  const autoRetakeHandledRef = useRef(false);

  const triggerQuizForChapter = useCallback(async (chapId, cId, courseObj, isRetake = false) => {
    const effectiveCourse = courseObj || activeCourse || locationState?.course;
    if (!isRetake && getCourseChapters && isChapterLocked && isLessonCompleted) {
      const allChaps = getCourseChapters(effectiveCourse);
      const targetChap = allChaps.find(c => String(c.id || '') === String(chapId));
      if (targetChap && targetChap.lessons && targetChap.lessons.length > 0) {
        const watchable = targetChap.lessons.filter(l => !isChapterLocked(l, effectiveCourse));
        const hasWatched = watchable.length > 0 && watchable.some(l => isLessonCompleted(l));
        if (watchable.length > 0 && !hasWatched) {
          if (setCustomAlert) {
            setCustomAlert({
              show: true,
              title: 'Quiz Locked',
              message: 'Please watch the video lesson first to unlock this Chapter Quiz Assessment!',
              buttonText: 'OK'
            });
          }
          return;
        }
      }
    }

    let quizInfo = findQuizForChapter(chapId, effectiveCourse);
    if (!quizInfo) {
      quizInfo = {
        id: effectiveCourse?.quiz_id || effectiveCourse?.quizId || chapId || 1,
        title: `Chapter Quiz`,
        chapter_id: chapId
      };
    }

    const resolvedCourseId = cId || effectiveCourse?.id || effectiveCourse?.course_id || locationState?.courseId || videoId || 1;

    try {
      const res = await api.dashboard.getUser('getQuizDetails', {
        formstep: 'getQuizDetails',
        course_id: resolvedCourseId,
        chapter_id: chapId,
        quiz_id: quizInfo.id || quizInfo.quiz_id || chapId,
        id: quizInfo.id || chapId
      });

      const { questions, title, quizId } = extractQuizFromResponse(res, quizInfo, chapId);

      setQuizModal({
        show: true,
        title,
        quizId,
        chapterId: chapId,
        courseId: resolvedCourseId,
        questions,
        currentIdx: 0,
        userAnswers: {},
        isSubmitting: false,
        completed: false,
        results: null
      });
    } catch (err) {
      console.error("Failed to fetch quiz details via API, using fallback", err);
      const fallbackQs = (Array.isArray(quizInfo.questions) && quizInfo.questions.length > 0)
        ? quizInfo.questions
        : getFallbackQuestions(quizInfo.title || `Chapter ${chapId} Quiz`, chapId);

      setQuizModal({
        show: true,
        title: quizInfo.title || `Chapter ${chapId} Quiz`,
        quizId: quizInfo.id || chapId,
        chapterId: chapId,
        courseId: resolvedCourseId,
        questions: fallbackQs,
        currentIdx: 0,
        userAnswers: {},
        isSubmitting: false,
        completed: false,
        results: null
      });
    }
  }, [activeCourse, locationState, videoId, getCourseChapters, isChapterLocked, isLessonCompleted, setCustomAlert]);

  // Auto-open quiz directly if navigated with selected chapter and retake flag
  useEffect(() => {
    if (!retakeParam || !chapterParam || autoRetakeHandledRef.current) return;

    if (!loading) {
      autoRetakeHandledRef.current = true;
      const effectiveCourse = activeCourse || locationState?.course;
      const resolvedCourseId = effectiveCourse?.id || effectiveCourse?.course_id || courseParam || videoId || 1;
      triggerQuizForChapter(chapterParam, resolvedCourseId, effectiveCourse, true);
    }
  }, [retakeParam, chapterParam, loading, activeCourse, locationState, courseParam, videoId, triggerQuizForChapter]);

  const handleSelectOption = useCallback((optIdx) => {
    const q = quizModal.questions[quizModal.currentIdx];
    if (!q) return;
    setQuizModal(prev => ({
      ...prev,
      userAnswers: {
        ...prev.userAnswers,
        [q.id]: optIdx
      }
    }));
  }, [quizModal.questions, quizModal.currentIdx]);

  const handleTextAnswer = useCallback((textVal) => {
    const q = quizModal.questions[quizModal.currentIdx];
    if (!q) return;
    const sanitized = (textVal || '').replace(/^\s+/, '');
    setQuizModal(prev => ({
      ...prev,
      userAnswers: {
        ...prev.userAnswers,
        [q.id]: sanitized
      }
    }));
  }, [quizModal.questions, quizModal.currentIdx]);

  const isCurrentQuestionAnswered = useCallback(() => {
    const currentQ = quizModal.questions[quizModal.currentIdx];
    if (!currentQ) return false;
    const ans = quizModal.userAnswers[currentQ.id];
    if (ans === undefined || ans === null) return false;
    const qType = String(currentQ.question_type || currentQ.questionType || 1);
    if (qType === '3') {
      return String(ans).trim().length > 0;
    }
    return true;
  }, [quizModal.questions, quizModal.currentIdx, quizModal.userAnswers]);

  const handleNextQuizQuestion = useCallback(() => {
    if (quizModal.currentIdx < quizModal.questions.length - 1) {
      setQuizModal(prev => ({
        ...prev,
        currentIdx: prev.currentIdx + 1
      }));
    }
  }, [quizModal.currentIdx, quizModal.questions.length]);

  const handleCloseQuizModal = useCallback(() => {
    const wasCompleted = quizModal.completed;
    const completedChapId = quizModal.chapterId;
    setQuizModal({
      show: false,
      title: '',
      quizId: 0,
      chapterId: 0,
      courseId: 0,
      questions: [],
      currentIdx: 0,
      userAnswers: {},
      isSubmitting: false,
      completed: false,
      results: null
    });

    if (wasCompleted && onNavigateToNextLesson) {
      onNavigateToNextLesson(completedChapId);
    }
  }, [quizModal.completed, quizModal.chapterId, onNavigateToNextLesson]);

  const handleRetakeQuiz = useCallback(() => {
    setQuizModal(prev => ({
      ...prev,
      completed: false,
      currentIdx: 0,
      userAnswers: {}
    }));
  }, []);

  const handleSubmitQuiz = useCallback(async () => {
    setQuizModal(prev => ({ ...prev, isSubmitting: true }));

    const answersPayload = quizModal.questions.map(q => {
      const qType = String(q.question_type || q.questionType || 1);
      const userAns = quizModal.userAnswers[q.id];
      let selectedDisplay = userAns;
      let optionId = null;

      if (qType === '3') {
        selectedDisplay = String(userAns || '').trim();
        optionId = q.option_id ?? q.optionId ?? q.blank_option_id ?? (Array.isArray(q.options) && q.options[0] && typeof q.options[0] === 'object' ? (q.options[0].option_id ?? q.options[0].id) : null);
      } else {
        const selectedIdx = typeof userAns === 'number' ? userAns : parseInt(userAns, 10);
        const effectiveOptions = (qType === '2' && (!q.options || q.options.length < 2))
          ? ["True", "False"]
          : (q.options || []);

        const chosenOpt = (Array.isArray(effectiveOptions) && selectedIdx >= 0 && selectedIdx < effectiveOptions.length)
          ? effectiveOptions[selectedIdx]
          : null;

        if (chosenOpt && typeof chosenOpt === 'object') {
          optionId = chosenOpt.option_id ?? chosenOpt.id ?? chosenOpt.optionId ?? null;
          selectedDisplay = chosenOpt.text || chosenOpt.option_text || chosenOpt.label || chosenOpt.name || JSON.stringify(chosenOpt);
        } else if (chosenOpt !== null && chosenOpt !== undefined) {
          selectedDisplay = chosenOpt;
        } else {
          selectedDisplay = selectedIdx;
        }

        if (optionId === null || optionId === undefined) {
          if (Array.isArray(q.option_ids) && q.option_ids[selectedIdx] !== undefined) {
            optionId = q.option_ids[selectedIdx];
          } else if (Array.isArray(q.optionIds) && q.optionIds[selectedIdx] !== undefined) {
            optionId = q.optionIds[selectedIdx];
          } else if (Array.isArray(q.options_data) && q.options_data[selectedIdx] && typeof q.options_data[selectedIdx] === 'object') {
            optionId = q.options_data[selectedIdx].option_id ?? q.options_data[selectedIdx].id ?? null;
          } else if (qType === '2') {
            if (selectedIdx === 0 && (q.true_option_id !== undefined || q.trueOptionId !== undefined)) {
              optionId = q.true_option_id ?? q.trueOptionId;
            } else if (selectedIdx === 1 && (q.false_option_id !== undefined || q.falseOptionId !== undefined)) {
              optionId = q.false_option_id ?? q.falseOptionId;
            }
          }
        }

        if (optionId === null || optionId === undefined) {
          if (typeof userAns === 'number') {
            optionId = userAns;
          } else if (!isNaN(selectedIdx) && selectedIdx >= 0) {
            optionId = selectedIdx;
          }
        }
      }

      return {
        question_id: q.id || q.question_id || q.questionId,
        question_type: qType,
        selected_option: userAns,
        selected_option_id: optionId,
        option_id: optionId,
        selected_text: selectedDisplay,
        user_answer: userAns
      };
    });

    const payload = {
      formstep: 'submitQuiz',
      formStep: 'submitQuiz',
      course_id: quizModal.courseId,
      chapter_id: quizModal.chapterId,
      quiz_id: quizModal.quizId,
      answers: answersPayload
    };

    let apiRes = null;
    try {
      apiRes = await api.dashboard.getUser('submitQuiz', payload);
    } catch (err) {
      console.error("Quiz submission API error", err);
    }

    const resData = Array.isArray(apiRes) && apiRes.length > 0
      ? apiRes[0]
      : (Array.isArray(apiRes?.data) && apiRes.data.length > 0
          ? apiRes.data[0]
          : (apiRes?.data || apiRes || {}));

    const scoreVal = resData?.score ?? resData?.correct_count ?? 0;
    const totalQs = resData?.total_questions ?? quizModal.questions.length;
    const scorePct = resData?.percentage ?? (totalQs > 0 ? Math.round((scoreVal / totalQs) * 100) : 0);
    const passingPct = resData?.passing_percentage ?? 70;
    const isPassedBool = Boolean(
      resData?.result === true ||
      String(resData?.result_str).toLowerCase() === 'passed' ||
      String(resData?.status).toLowerCase() === 'passed'
    );

    let generatedCredentialId = null;
    let learnerName = 'Learner';

    if (isPassedBool) {
      try {
        const u = authUser || {};
        learnerName = u.name || u.fullname || u.username || (u.email ? u.email.split('@')[0] : 'Alex Graham');
        const courseName = video?.courseTitle || video?.course_title || video?.title || 'TypeScript Basics & Architecture';
        const acronym = (courseName.replace(/[^a-zA-Z]/g, '').slice(0, 3) || 'TSB').toUpperCase();
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const year = new Date().getFullYear();
        generatedCredentialId = `CERT-${acronym}-${year}-${randomNum}`;
        const issueDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        const newCertificate = {
          id: `cert_${Date.now()}`,
          title: courseName,
          chapterTitle: quizModal.title || 'Chapter Assessment',
          issuer: 'XLurn Learning Academy',
          issueDate: issueDate,
          credentialId: generatedCredentialId,
          score: `${scorePct}%`,
          badge: scorePct >= 90 ? '🏆' : '🎓',
          learnerName: learnerName,
          verified: true,
          courseId: quizModal.courseId || video?.id || 1,
          chapterId: quizModal.chapterId || 1
        };

        const existingCerts = JSON.parse(localStorage.getItem('earned_certificates') || '[]');
        const filtered = existingCerts.filter(c => c.courseId !== newCertificate.courseId || c.title !== newCertificate.title);
        const updatedCerts = [newCertificate, ...filtered];
        localStorage.setItem('earned_certificates', JSON.stringify(updatedCerts));

        setEarnedCertificate(newCertificate);
        window.dispatchEvent(new CustomEvent('certificate_earned', { detail: newCertificate }));
      } catch (e) {
        console.error('Error generating certificate:', e);
      }
    }

    let detailedAnswers = [];
    if (Array.isArray(resData?.answers) && resData.answers.length > 0) {
      detailedAnswers = resData.answers.map(ans => {
        const origQ = quizModal.questions.find(q => String(q.id || q.question_id || q.questionId) === String(ans.question_id));
        return {
          question_id: ans.question_id,
          question: ans.question_text || ans.question || origQ?.question || '',
          question_text: ans.question_text || ans.question || origQ?.question || '',
          question_type: String(ans.question_type || origQ?.question_type || origQ?.questionType || '1'),
          selected_option: ans.selected_option,
          selected_option_id: ans.selected_option_id,
          selected_text: ans.selected_text || ans.user_answer || '',
          user_answer: ans.selected_text || ans.user_answer || '',
          correct_option: ans.correct_option,
          correct_option_id: ans.correct_option_id,
          correct_answer: ans.correct_answer || ans.correct_text || '',
          correct_text: ans.correct_answer || ans.correct_text || '',
          is_correct: ans.is_correct === true || String(ans.status).toLowerCase() === 'correct',
          status: ans.status || (ans.is_correct ? 'Correct' : 'Wrong'),
          options: Array.isArray(ans.options) && ans.options.length > 0 ? ans.options : (origQ?.options || [])
        };
      });
    } else {
      detailedAnswers = answersPayload.map(a => {
        const origQ = quizModal.questions.find(q => String(q.id || q.question_id || q.questionId) === String(a.question_id));
        return {
          ...a,
          question: origQ?.question || '',
          question_text: origQ?.question || '',
          options: origQ?.options || [],
          is_correct: false
        };
      });
    }

    setQuizModal(prev => ({
      ...prev,
      isSubmitting: false,
      completed: true,
      results: {
        score: scoreVal,
        totalQuestions: totalQs,
        percentage: scorePct,
        answers: detailedAnswers,
        isPassed: isPassedBool,
        resultStr: resData?.result_str || (isPassedBool ? 'Passed' : 'Failed'),
        status: resData?.status || (isPassedBool ? 'Passed' : 'Failed'),
        passingPercentage: passingPct,
        correctCount: resData?.correct_count ?? scoreVal,
        wrongCount: resData?.wrong_count ?? (totalQs - scoreVal),
        credentialId: generatedCredentialId,
        learnerName: learnerName
      }
    }));
  }, [quizModal, authUser, video]);

  return {
    quizModal,
    setQuizModal,
    earnedCertificate,
    setEarnedCertificate,
    triggerQuizForChapter,
    handleSelectOption,
    handleTextAnswer,
    isCurrentQuestionAnswered,
    handleNextQuizQuestion,
    handleCloseQuizModal,
    handleRetakeQuiz,
    handleSubmitQuiz
  };
};

export default useVideoQuiz;
