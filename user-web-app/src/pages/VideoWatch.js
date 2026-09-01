import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api, getCurrentUser } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import PremiumSelect from '../components/PremiumSelect';

const VideoWatch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  
  const [video, setVideo] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Custom Alert Modal State (Same as UserDashboard / Login page)
  const [customAlert, setCustomAlert] = useState({
    show: false,
    title: 'Upgrade Required',
    message: '',
    buttonText: 'OK'
  });

  const showUpgradeAlert = (message = 'Need to upgrade your plan') => {
    setCustomAlert({
      show: true,
      title: 'Upgrade Required',
      message,
      buttonText: 'OK'
    });
  };

  const currentUser = getCurrentUser();
  const userPlan = String(location.state?.userPlan ?? location.state?.user_plan ?? currentUser?.user_plan ?? currentUser?.user_plan_id ?? '1');

  const isChapterLocked = (lesson, courseObj = null) => {
    if (!lesson) return false;
    if (userPlan !== '1') return false;

    const vis = lesson.visibility ?? lesson.visibility_id ?? lesson.is_private ?? lesson.isPrivate ?? courseObj?.visibility ?? courseObj?.visibility_id;
    const visStr = String(vis || '').toLowerCase();
    return visStr === '2' || visStr === 'private' || vis === true || vis === 2;
  };
  
  const videoRef = useRef(null);
  const trackingIntervalRef = useRef(null);
  const [lastPositionLoaded, setLastPositionLoaded] = useState(false);
  const [savedPositionText, setSavedPositionText] = useState('');

  // Playback detailed analytics tracking
  const trackingDataRef = useRef({
    isNewSession: true,
    watchTime: 0,
    pausedCount: 0,
    forwardedCount: 0,
    backwardCount: 0
  });
  const prevTimeRef = useRef(0);
  const isResumingRef = useRef(false);
  const seekStartTimeRef = useRef(0);
  const idRef = useRef(id);
  const currentTimeRef = useRef(0);
  const videoRefData = useRef(null);

  useEffect(() => {
    idRef.current = id;
  }, [id]);

  useEffect(() => {
    videoRefData.current = video;
    if (videoRef.current && video) {
      videoRef.current.load();
      setIsPlaying(true);
      videoRef.current.play().catch(err => {
        console.log("Autoplay prevented:", err);
        setIsPlaying(false);
      });
    }
  }, [video]);

  const [ipAddress, setIpAddress] = useState('127.0.0.1');
  const sessionStartedAtRef = useRef(new Date().toISOString());

  useEffect(() => {
    sessionStartedAtRef.current = new Date().toISOString();
  }, [id]);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(data => setIpAddress(data.ip))
      .catch(err => console.log("Failed to fetch IP, using fallback", err));
  }, []);

  const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return "Tablet";
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
      return "Mobile";
    }
    return "Desktop";
  };

  const getPlatform = () => {
    const ua = navigator.userAgent;
    if (ua.indexOf("Win") !== -1) return "Windows";
    if (ua.indexOf("Mac") !== -1) return "MacOS";
    if (ua.indexOf("X11") !== -1) return "UNIX";
    if (ua.indexOf("Linux") !== -1) return "Linux";
    if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
    if (/Android/.test(ua)) return "Android";
    return navigator.platform || "Unknown";
  };

  // Player UI states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1.0); // 0.0 to 1.0
  const [isMuted, setIsMuted] = useState(false);
  const [quality, setQuality] = useState('Auto');
  const [isQualitySwitching, setIsQualitySwitching] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        trackingDataRef.current.watchTime += 1;
        if (trackingDataRef.current.watchTime > 0 && trackingDataRef.current.watchTime % 10 === 0) {
          saveProgress();
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // YouTube metadata engagement states
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isDisliked, setIsDisliked] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    fetchVideoAndRecommendations(location.state?.video);
    setLastPositionLoaded(false);
    setSavedPositionText('');
    
    return () => {
      clearInterval(trackingIntervalRef.current);
      saveProgress();
      
      const activeVid = videoRefData.current || location.state?.video;
      const activeCourse = location.state?.course;
      const cId = activeVid?.course_id ?? activeVid?.courseId ?? activeCourse?.id ?? activeCourse?.course_id ?? location.state?.courseId ?? location.state?.course_id ?? 0;
      const chapId = activeVid?.chapter_id ?? activeVid?.chapterId ?? location.state?.chapterId ?? location.state?.chapter_id ?? 0;
      const vidId = idRef.current || id || activeVid?.id;

      if (currentTimeRef.current >= 1 && vidId) {
        api.dashboard.getUser('watchHistory', { 
          id: vidId,
          title: activeVid?.title || '',
          thumbnail: activeVid?.thumbnail || activeVid?.thumbnailUrl || activeVid?.thumbnail_url || '',
          video_url: activeVid?.videoUrl || activeVid?.video_url || '',
          course_id: cId,
          chapter_id: chapId,
          completion_percentage: Math.min(100, Math.round(((currentTimeRef.current || 1) / (duration || 300)) * 100))
        }).catch(err => {
          console.error("Failed to register watchHistory", err);
        });
      }
    };
  }, [id, location.state]);

  // Keyboard Hotkeys listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'm':
          handleMuteToggle();
          break;
        case 'f':
          e.preventDefault();
          handleFullscreen();
          break;
        case 'arrowleft':
          e.preventDefault();
          handleSeek(-5);
          break;
        case 'arrowright':
          e.preventDefault();
          handleSeek(5);
          break;
        case 'arrowup':
          e.preventDefault();
          const upVol = Math.min(1.0, volume + 0.1);
          handleVolumeChange(upVol);
          break;
        case 'arrowdown':
          e.preventDefault();
          const downVol = Math.max(0.0, volume - 0.1);
          handleVolumeChange(downVol);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, isMuted]);

  const fetchVideoAndRecommendations = async (passedVideo = null) => {
    setLoading(true);
    try {
      let videoData = passedVideo || location.state?.video;
      if (!videoData) {
        try {
          videoData = await api.videos.get(id);
        } catch (apiError) {
          console.warn("Could not load video details from API, using state or fallback", apiError);
        }
      }

      if (!videoData) {
        throw new Error('Video details not found');
      }

      setVideo(videoData);
      setLikesCount(videoData.views ? Math.round(videoData.views * 0.12) : 12);
      setIsLiked(false);
      setIsDisliked(false);
      setIsSubscribed(false);

      // Fetch watch history
      const history = await api.videos.getHistory().catch(() => []);
      const thisRecord = history.find(h => h.videoId === id);
      if (thisRecord && thisRecord.lastPosition > 5 && thisRecord.completionPercentage < 95) {
        const mins = Math.floor(thisRecord.lastPosition / 60);
        const secs = Math.floor(thisRecord.lastPosition % 60);
        setSavedPositionText(`${t('watch.resumeTitle')} (${mins}:${secs < 10 ? '0' : ''}${secs})`);
      }

      // Fetch related recommendations
      let list = [];
      try {
        list = await api.videos.list({ category: videoData.category });
      } catch (listError) {
        console.warn("Could not load recommendations", listError);
      }
      
      const filteredRecs = Array.isArray(list) 
        ? list.filter(v => String(v.id) !== String(id)) 
        : [];
      setRecommendations(filteredRecs.slice(0, 4));
    } catch (e) {
      console.error(e);
      setError('Failed to load video details');
    } finally {
      setLoading(false);
    }
  };

  // Chapter Accordion State
  const [expandedChapters, setExpandedChapters] = useState({});

  const toggleChapterExpand = (chapKey) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapKey]: prev[chapKey] !== undefined ? !prev[chapKey] : false
    }));
  };

  // Chapter Quiz Modal State
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

  const getFallbackQuestions = (quizTitle, chapId) => {
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

  const findQuizForChapter = (chapId, courseObj) => {
    if (!courseObj) {
      return { id: chapId || 1, title: `Chapter Quiz`, chapter_id: chapId || 1 };
    }
    
    // 1. Direct quiz property on courseObj or chapter
    if (courseObj.quiz && typeof courseObj.quiz === 'object') return courseObj.quiz;

    // 2. If courseObj.quizzes is a single object
    if (courseObj.quizzes && !Array.isArray(courseObj.quizzes) && typeof courseObj.quizzes === 'object') {
      return courseObj.quizzes;
    }

    // 3. Search in courseObj.quizzes array matching chapter_id
    if (Array.isArray(courseObj.quizzes) && courseObj.quizzes.length > 0) {
      const found = courseObj.quizzes.find(q => 
        q && (
          String(q.chapter_id || q.chapterId || q.chapter || '') === String(chapId) ||
          String(q.course_id || q.courseId || '') === String(courseObj.id || courseObj.course_id || '')
        )
      );
      if (found) return found;

      // If single quiz in array (or single chapter course), return the single quiz!
      if (courseObj.quizzes.length === 1) {
        return courseObj.quizzes[0];
      }
    }

    // 4. Search in courseObj.chapters array
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

    // 5. Fallback matching chapter_id to index in quizzes
    if (Array.isArray(courseObj.quizzes) && courseObj.quizzes.length > 0) {
      let idx = parseInt(chapId, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= courseObj.quizzes.length) {
        idx = 0;
      }
      return courseObj.quizzes[idx];
    }

    // 6. Default fallback so triggerQuizForChapter always executes
    return {
      id: courseObj.quiz_id || courseObj.quizId || chapId || 1,
      chapter_id: chapId || 1,
      title: `Chapter Quiz`
    };
  };

  const extractQuizFromResponse = (res, quizInfo, chapId) => {
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

  const triggerQuizForChapter = async (chapId, cId, courseObj) => {
    let quizInfo = findQuizForChapter(chapId, courseObj);
    if (!quizInfo) {
      quizInfo = {
        id: courseObj?.quiz_id || courseObj?.quizId || chapId || 1,
        title: `Chapter Quiz`,
        chapter_id: chapId
      };
    }

    try {
      // Call vdUser API with formstep of getQuizDetails
      const res = await api.dashboard.getUser('getQuizDetails', {
        formstep: 'getQuizDetails',
        course_id: cId,
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
        courseId: cId,
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
        courseId: cId,
        questions: fallbackQs,
        currentIdx: 0,
        userAnswers: {},
        isSubmitting: false,
        completed: false,
        results: null
      });
    }
  };

  const handleSelectOption = (optIdx) => {
    const q = quizModal.questions[quizModal.currentIdx];
    if (!q) return;
    setQuizModal(prev => ({
      ...prev,
      userAnswers: {
        ...prev.userAnswers,
        [q.id]: optIdx
      }
    }));
  };

  const handleTextAnswer = (textVal) => {
    const q = quizModal.questions[quizModal.currentIdx];
    if (!q) return;
    setQuizModal(prev => ({
      ...prev,
      userAnswers: {
        ...prev.userAnswers,
        [q.id]: textVal
      }
    }));
  };

  const handleNextQuizQuestion = () => {
    if (quizModal.currentIdx < quizModal.questions.length - 1) {
      setQuizModal(prev => ({
        ...prev,
        currentIdx: prev.currentIdx + 1
      }));
    }
  };

  const navigateToNextLessonOrChapter = () => {
    const activeVid = videoRefData.current || video || location.state?.video;
    const activeCourse = location.state?.course;
    const vidId = idRef.current || id || activeVid?.id;

    const lessons = getCourseLessonsList(activeCourse);
    if (lessons && lessons.length > 0) {
      const currentIdx = lessons.findIndex(l => String(l.id || l.videoUrl || l.video_url) === String(vidId || activeVid?.videoUrl));
      if (currentIdx !== -1 && currentIdx + 1 < lessons.length) {
        const nextLesson = lessons[currentIdx + 1];
        if (!isChapterLocked(nextLesson, activeCourse)) {
          setTimeout(() => {
            handleNavigateToVideo(nextLesson, activeCourse);
          }, 300);
        }
      }
    }
  };

  const handleCloseQuizModal = () => {
    const wasCompleted = quizModal.completed;
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

    if (wasCompleted) {
      navigateToNextLessonOrChapter();
    }
  };

  const handleSubmitQuiz = async () => {
    setQuizModal(prev => ({ ...prev, isSubmitting: true }));
    let correctCount = 0;
    const answerBreakdown = quizModal.questions.map(q => {
      const qType = String(q.question_type || q.questionType || 1);
      const userAns = quizModal.userAnswers[q.id];
      let isCorrect = false;
      let selectedDisplay = userAns;
      let correctDisplay = q.correctAnswer;

      if (qType === '3') { // Fill in the blanks / Free text
        let expectedAns = q.blankAnswer || q.blank_answer || q.correct_answer || q.answer || '';
        if (!expectedAns && Array.isArray(q.options) && q.options.length > 0) {
          const cIdx = (typeof q.correctAnswer === 'number' && q.options[q.correctAnswer]) ? q.correctAnswer : 0;
          expectedAns = q.options[cIdx];
        }

        const isFuzzyMatch = (userStr, targetStr) => {
          if (!userStr || !targetStr) return false;
          const uClean = String(userStr).trim().toLowerCase();
          const tClean = String(targetStr).trim().toLowerCase();
          if (!uClean || !tClean) return false;

          // Direct exact match
          if (uClean === tClean) return true;

          // Substring match
          if (uClean.length >= 4 && tClean.length >= 4) {
            if (tClean.includes(uClean) || uClean.includes(tClean)) return true;
          }

          const stopwords = new Set([
            'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'against',
            'between', 'into', 'through', 'during', 'before', 'after', 'above',
            'below', 'from', 'up', 'down', 'in', 'out', 'off', 'over', 'under',
            'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
            'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
            'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
            'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'and', 'or', 'if', 'as'
          ]);

          const tokenize = (str) => {
            return str
              .replace(/[^\w\s]/gi, ' ')
              .toLowerCase()
              .split(/\s+/)
              .filter(w => w.length > 1 && !stopwords.has(w));
          };

          const uTokens = tokenize(uClean);
          const tTokens = tokenize(tClean);

          if (tTokens.length === 0) return uClean === tClean;
          if (uTokens.length === 0) return false;

          let matchCount = 0;
          tTokens.forEach(tWord => {
            if (uTokens.some(uWord => uWord === tWord || (tWord.length >= 4 && uWord.length >= 4 && (uWord.startsWith(tWord.slice(0, 4)) || tWord.startsWith(uWord.slice(0, 4)))))) {
              matchCount++;
            }
          });

          const tRatio = matchCount / tTokens.length;

          let uMatchCount = 0;
          uTokens.forEach(uWord => {
            if (tTokens.some(tWord => uWord === tWord || (tWord.length >= 4 && uWord.length >= 4 && (uWord.startsWith(tWord.slice(0, 4)) || tWord.startsWith(uWord.slice(0, 4)))))) {
              uMatchCount++;
            }
          });
          const uRatio = uMatchCount / uTokens.length;

          return tRatio >= 0.35 || uRatio >= 0.6 || (tTokens.length <= 3 && matchCount >= 1) || matchCount >= 2;
        };

        isCorrect = isFuzzyMatch(userAns, expectedAns);
        selectedDisplay = String(userAns || '').trim();
        correctDisplay = String(expectedAns || '').trim();
      } else { // MCQ (1) or True/False (2)
        const selectedIdx = typeof userAns === 'number' ? userAns : parseInt(userAns, 10);
        const correctIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : parseInt(q.correctAnswer, 10);
        isCorrect = selectedIdx === correctIdx;

        const effectiveOptions = (qType === '2' && (!q.options || q.options.length < 2))
          ? ["True", "False"]
          : (q.options || []);

        selectedDisplay = (Array.isArray(effectiveOptions) && selectedIdx >= 0 && selectedIdx < effectiveOptions.length)
          ? effectiveOptions[selectedIdx]
          : selectedIdx;

        correctDisplay = (Array.isArray(effectiveOptions) && correctIdx >= 0 && correctIdx < effectiveOptions.length)
          ? effectiveOptions[correctIdx]
          : correctIdx;
      }

      if (isCorrect) correctCount++;

      return {
        question_id: q.id,
        question: q.question,
        question_type: qType,
        options: q.options || [],
        selected_option: userAns,
        selected_text: selectedDisplay,
        user_answer: userAns,
        correct_option: q.correctAnswer,
        correct_text: correctDisplay,
        is_correct: isCorrect
      };
    });

    const totalQs = quizModal.questions.length;
    const scorePct = totalQs > 0 ? Math.round((correctCount / totalQs) * 100) : 0;
    const isPassedBool = scorePct >= 70;

    const payload = {
      formstep: 'submitQuiz',
      formStep: 'submitQuiz',
      course_id: quizModal.courseId,
      chapter_id: quizModal.chapterId,
      quiz_id: quizModal.quizId,
      score: correctCount,
      total_questions: totalQs,
      percentage: scorePct,
      result: isPassedBool,
      result_str: isPassedBool ? 'Passed' : 'Failed',
      status: isPassedBool ? 'Passed' : 'Failed',
      answers: answerBreakdown.map(a => ({
        question_id: a.question_id,
        question_type: a.question_type,
        selected_option: a.selected_option,
        user_answer: a.user_answer,
        selected_text: a.selected_text,
        is_correct: a.is_correct
      }))
    };

    try {
      await api.dashboard.getUser('submitQuiz', payload);
    } catch (err) {
      console.error("Quiz submission API error", err);
    }

    setQuizModal(prev => ({
      ...prev,
      isSubmitting: false,
      completed: true,
      results: {
        score: correctCount,
        totalQuestions: totalQs,
        percentage: scorePct,
        answers: answerBreakdown
      }
    }));
  };

  const getCourseChapters = (courseObj) => {
    if (!courseObj) return [];
    const cId = courseObj.id || courseObj.course_id || courseObj.courseId || 0;

    // 1. If courseObj.chapters is an array of objects with videos/lessons
    if (Array.isArray(courseObj.chapters) && courseObj.chapters.length > 0 && typeof courseObj.chapters[0] === 'object') {
      return courseObj.chapters.map((chap, cIdx) => {
        const chapId = chap.id ?? chap.chapter_id ?? chap.chapterId ?? (cIdx + 1);
        const chapTitle = chap.title || chap.chapter_title || chap.chapter_name || chap.name || chap.chapter || `Chapter ${cIdx + 1}`;
        const rawItems = Array.isArray(chap.videos) ? chap.videos : (Array.isArray(chap.lessons) ? chap.lessons : []);
        const lessons = rawItems.map((v, vIdx) => {
          if (typeof v === 'string') {
            return {
              id: `${cId}-${chapId}-${vIdx}`,
              title: `Lesson ${vIdx + 1}`,
              videoUrl: v,
              thumbnailUrl: courseObj.thumbnail || '',
              thumbnail: courseObj.thumbnail || '',
              course_id: cId,
              chapter_id: chapId,
              chapter: chapTitle
            };
          }
          const tUrl = v.video_thumbnail || v.videoThumbnail || v.thumbnail || v.thumbnailUrl || v.thumbnail_url || courseObj.thumbnail || '';
          return {
            ...v,
            id: v.id || v.video_id || `${cId}-${chapId}-${vIdx}`,
            title: v.title || v.video_title || v.name || `Lesson ${vIdx + 1}`,
            thumbnail: tUrl,
            thumbnailUrl: tUrl,
            course_id: v.course_id || v.courseId || cId,
            chapter_id: v.chapter_id || v.chapterId || chapId,
            chapter: v.chapter || chapTitle
          };
        });
        return {
          id: chapId,
          title: chapTitle,
          quiz: chap.quiz,
          lessons
        };
      });
    }

    // 2. If courseObj.videos or courseObj.lessons is a flat array, group by chapter_id / chapter
    const rawList = Array.isArray(courseObj.videos) ? courseObj.videos : (Array.isArray(courseObj.lessons) ? courseObj.lessons : []);
    if (rawList.length > 0) {
      const chaptersMap = new Map();
      rawList.forEach((v, vIdx) => {
        let item = v;
        if (typeof v === 'string') {
          item = {
            id: `${cId}-v-${vIdx}`,
            title: `Lesson ${vIdx + 1}`,
            videoUrl: v,
            thumbnailUrl: courseObj.thumbnail || '',
            thumbnail: courseObj.thumbnail || '',
            course_id: cId,
            chapter_id: 1,
            chapter: 'Chapter 1'
          };
        } else {
          const tUrl = v.video_thumbnail || v.videoThumbnail || v.thumbnail || v.thumbnailUrl || v.thumbnail_url || courseObj.thumbnail || '';
          const chapId = v.chapter_id ?? v.chapterId ?? 1;
          const chapTitle = v.chapter || v.chapter_name || v.chapter_title || `Chapter ${chapId}`;
          item = {
            ...v,
            id: v.id || v.video_id || `${cId}-${chapId}-${vIdx}`,
            title: v.title || v.video_title || v.name || `Lesson ${vIdx + 1}`,
            thumbnail: tUrl,
            thumbnailUrl: tUrl,
            course_id: v.course_id || v.courseId || cId,
            chapter_id: chapId,
            chapter: chapTitle
          };
        }
        const chapKey = String(item.chapter_id);
        if (!chaptersMap.has(chapKey)) {
          chaptersMap.set(chapKey, {
            id: item.chapter_id,
            title: item.chapter || `Chapter ${item.chapter_id}`,
            lessons: []
          });
        }
        chaptersMap.get(chapKey).lessons.push(item);
      });
      return Array.from(chaptersMap.values());
    }

    return [];
  };

  const getCourseLessonsList = (courseObj) => {
    if (!courseObj) return [];
    const chapters = getCourseChapters(courseObj);
    if (chapters.length > 0) {
      return chapters.flatMap(c => c.lessons);
    }
    return [];
  };

  const startProgressTracking = () => {
    // Silent local tracking of metrics (watchTime increments automatically in active play interval)
  };

  const stopProgressTracking = () => {
    clearInterval(trackingIntervalRef.current);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    startProgressTracking();
  };

  const handlePause = () => {
    setIsPlaying(false);
    stopProgressTracking();
    if (videoRef.current && !videoRef.current.seeking && videoRef.current.currentTime < videoRef.current.duration) {
      trackingDataRef.current.pausedCount += 1;
    }
  };

  async function saveProgress(force = false) {
    const activeVid = videoRefData.current || video || location.state?.video;
    const pos = Math.round(videoRef.current ? videoRef.current.currentTime : (currentTimeRef.current || 0));
    const dur = Math.round(videoRef.current ? (videoRef.current.duration || activeVid?.duration || 300) : (activeVid?.duration || 300));
    const deltaWatchTime = trackingDataRef.current.watchTime;
    const vidId = idRef.current || id || activeVid?.id;
    
    if ((pos > 0 && (deltaWatchTime > 0 || force)) || force) {
      try {
        const activeCourse = location.state?.course;
        const cId = activeVid?.course_id ?? activeVid?.courseId ?? activeCourse?.id ?? activeCourse?.course_id ?? location.state?.courseId ?? location.state?.course_id ?? 0;
        const chapId = activeVid?.chapter_id ?? activeVid?.chapterId ?? location.state?.chapterId ?? location.state?.chapter_id ?? 0;
        const compPercent = force ? 100 : Math.min(100, Math.round((pos / (dur || 1)) * 100));
        const isComplete = compPercent >= 90 || force;

        await api.dashboard.getUser('watchsession', {
          id: vidId,
          videoid: vidId,
          videoId: vidId,
          course_id: cId,
          chapter_id: chapId,
          lastPosition: pos,
          lastPositionTime: formatTime(pos),
          duration: formatTime(dur),
          isNewSession: trackingDataRef.current.isNewSession,
          watchTime: formatTime(deltaWatchTime > 0 ? deltaWatchTime : pos),
          pausedCount: trackingDataRef.current.pausedCount,
          forwardedCount: trackingDataRef.current.forwardedCount,
          backwardCount: trackingDataRef.current.backwardCount,
          title: activeVid?.title || '',
          thumbnail: activeVid?.thumbnail || activeVid?.thumbnailUrl || activeVid?.thumbnail_url || '',
          video_url: activeVid?.videoUrl || activeVid?.video_url || '',
          device_type: getDeviceType(),
          platform: getPlatform(),
          started_at: sessionStartedAtRef.current,
          ended_at: new Date().toISOString(),
          watch_duration_sec: deltaWatchTime > 0 ? deltaWatchTime : pos,
          video_duration_sec: dur,
          status: isComplete,
          staus: isComplete,
          completion_percentage: compPercent,
          playback_speed: playbackSpeed,
          quality: quality,
          ip_address: ipAddress
        });
        
        trackingDataRef.current.watchTime = 0;
        trackingDataRef.current.isNewSession = false;
      } catch (e) {
        console.error("Failed to track video progress", e);
      }
    }
  };

  const handleNavigateToVideo = async (targetVideo, courseObj = location.state?.course) => {
    if (isChapterLocked(targetVideo, courseObj)) {
      showUpgradeAlert('Need to upgrade your plan');
      return;
    }

    await saveProgress(true);

    const activeVid = videoRefData.current || video || location.state?.video;
    const activeCourse = location.state?.course;
    const cId = activeVid?.course_id ?? activeVid?.courseId ?? activeCourse?.id ?? activeCourse?.course_id ?? 0;
    const chapId = activeVid?.chapter_id ?? activeVid?.chapterId ?? 0;
    const vidId = idRef.current || id || activeVid?.id;

    if ((currentTimeRef.current >= 1 || trackingDataRef.current.watchTime >= 1) && vidId) {
      try {
        await api.dashboard.getUser('watchHistory', { 
          id: vidId,
          title: activeVid?.title || '',
          thumbnail: activeVid?.thumbnail || activeVid?.thumbnailUrl || activeVid?.thumbnail_url || '',
          video_url: activeVid?.videoUrl || activeVid?.video_url || '',
          course_id: cId,
          chapter_id: chapId,
          completion_percentage: Math.min(100, Math.round(((currentTimeRef.current || 1) / (duration || 300)) * 100))
        });
      } catch (err) {
        console.error("Failed to register watchHistory on video switch", err);
      }
    }

    trackingDataRef.current = { watchTime: 0, pausedCount: 0, forwardedCount: 0, backwardCount: 0, isNewSession: true };
    currentTimeRef.current = 0;

    const targetId = targetVideo.id || targetVideo.videoUrl || targetVideo.video_url;
    navigate(`/watch/${targetId}`, { state: { video: targetVideo, course: courseObj, userPlan } });
  };

  const handleVideoEnded = async () => {
    await saveProgress(true);

    const activeVid = videoRefData.current || video || location.state?.video;
    const activeCourse = location.state?.course || video?.course || null;
    const cId = activeVid?.course_id ?? activeVid?.courseId ?? activeCourse?.id ?? activeCourse?.course_id ?? 0;
    const chapId = activeVid?.chapter_id ?? activeVid?.chapterId ?? 1;
    const vidId = idRef.current || id || activeVid?.id;

    if (vidId) {
      try {
        await api.dashboard.getUser('watchHistory', { 
          id: vidId,
          title: activeVid?.title || '',
          thumbnail: activeVid?.thumbnail || activeVid?.thumbnailUrl || activeVid?.thumbnail_url || '',
          video_url: activeVid?.videoUrl || activeVid?.video_url || '',
          course_id: cId,
          chapter_id: chapId,
          completion_percentage: 100,
          status: true,
          staus: true
        });
      } catch (err) {
        console.error("Failed to register video completion watchHistory", err);
      }
    }

    // Always trigger quiz on video completion (triggers getQuizDetails API call)
    triggerQuizForChapter(chapId, cId, activeCourse);
  };

  const handleResume = () => {
    if (videoRef.current) {
      api.videos.getHistory().then(history => {
        const thisRecord = history.find(h => h.videoId === id);
        if (thisRecord && thisRecord.lastPosition) {
          isResumingRef.current = true;
          videoRef.current.currentTime = thisRecord.lastPosition;
          prevTimeRef.current = thisRecord.lastPosition;
          videoRef.current.play().catch(e => console.log(e));
        }
      });
    }
    setSavedPositionText('');
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.log(e));
      }
    }
  };

  const handleSeek = (seconds) => {
    if (videoRef.current) {
      isResumingRef.current = true;
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
      if (seconds > 0) {
        trackingDataRef.current.forwardedCount += 1;
      } else {
        trackingDataRef.current.backwardCount += 1;
      }
    }
  };

  const handleVolumeChange = (newVolume) => {
    const val = parseFloat(newVolume);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      if (!nextMuted && volume === 0) {
        handleVolumeChange(0.5);
      }
    }
  };

  const handleQualityChange = (newQuality) => {
    setQuality(newQuality);
    setIsQualitySwitching(true);
    
    // Simulate network quality switching delay
    if (videoRef.current) {
      videoRef.current.pause();
      const currentPos = videoRef.current.currentTime;
      setTimeout(() => {
        setIsQualitySwitching(false);
        if (videoRef.current) {
          videoRef.current.currentTime = currentPos;
          if (isPlaying) {
            videoRef.current.play().catch(e => console.log(e));
          }
        }
      }, 800);
    }
  };

  const handleSpeedChange = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      } else if (videoRef.current.msRequestFullscreen) {
        videoRef.current.msRequestFullscreen();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      currentTimeRef.current = videoRef.current.currentTime;
      setDuration(videoRef.current.duration || video?.duration || 0);
      if (!videoRef.current.seeking) {
        prevTimeRef.current = videoRef.current.currentTime;
      }
    }
  };

  const handleSeeked = () => {
    if (videoRef.current) {
      if (isResumingRef.current) {
        isResumingRef.current = false;
        prevTimeRef.current = videoRef.current.currentTime;
        return;
      }
      const current = videoRef.current.currentTime;
      const prev = prevTimeRef.current;
      if (current > prev + 1.5) {
        trackingDataRef.current.forwardedCount += 1;
      } else if (current < prev - 1.5) {
        trackingDataRef.current.backwardCount += 1;
      }
      prevTimeRef.current = current;
    }
  };

  const handleTimelineDragStart = () => {
    if (videoRef.current) {
      seekStartTimeRef.current = videoRef.current.currentTime;
    }
  };

  const handleTimelineDragEnd = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const start = seekStartTimeRef.current;
      if (current > start + 1.5) {
        trackingDataRef.current.forwardedCount += 1;
      } else if (current < start - 1.5) {
        trackingDataRef.current.backwardCount += 1;
      }
      prevTimeRef.current = current;
    }
  };

  function formatTime(timeInSeconds) {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isCurrentVideoLocked = () => {
    if (!video) return false;
    if (userPlan !== '1') return false;

    const vis = video.visibility ?? video.visibility_id ?? video.is_private ?? video.isPrivate ?? location.state?.course?.visibility ?? location.state?.course?.visibility_id;
    const visStr = String(vis || '').toLowerCase();
    return visStr === '2' || visStr === 'private' || vis === true || vis === 2;
  };

  const handleSaveToWatchLater = async () => {
    try {
      await api.dashboard.getUser('watchLater', { 
        id,
        title: video?.title || '',
        thumbnail: video?.thumbnail || video?.thumbnailUrl || video?.thumbnail_url || '',
        video_url: video?.videoUrl || video?.video_url || ''
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadVideo = async () => {
    if (userPlan === '1' || userPlan !== '2') {
      showUpgradeAlert('Need to upgrade your plan');
      return;
    }
    try {
      const videoUrl = video?.videoUrl || video?.video_url;
      if (!videoUrl) {
        return;
      }
      
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      const filename = videoUrl.split('/').pop().split('?')[0] || 'video.mp4';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      await api.dashboard.getUser('download_video', { 
        id,
        title: video?.title || '',
        thumbnail: video?.thumbnail || video?.thumbnailUrl || video?.thumbnail_url || '',
        video_url: videoUrl
      });
    } catch (e) {
      console.error("Download failed", e);
      try {
        const videoUrl = video?.videoUrl || video?.video_url;
        if (videoUrl) {
          window.open(videoUrl, '_blank');
          await api.dashboard.getUser('download_video', { 
            id,
            title: video?.title || '',
            thumbnail: video?.thumbnail || video?.thumbnailUrl || video?.thumbnail_url || '',
            video_url: videoUrl
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '100px' }}>{t('admin.loading')}</div>;
  if (error || !video) return <div style={{ color: '#ef4444', textAlign: 'center', padding: '100px' }}>{error || 'Video not found'}</div>;

  const srcUrl = (() => {
    const url = video.videoUrl || video.video_url;
    if (!url || url.includes('commondatastorage.googleapis.com') || url.startsWith('/videos/')) {
      return 'https://www.w3schools.com/html/mov_bbb.mp4';
    }
    if (url.startsWith('/uploads')) {
      const ext = url.split('.').pop().toLowerCase();
      if (['mp4', 'webm', 'ogg'].includes(ext)) {
        return `http://localhost:5000${url}`;
      }
      return 'https://www.w3schools.com/html/mov_bbb.mp4';
    }
    return url;
  })();

  return (
    <div className="watch-layout" style={{ padding: '32px 40px', overflowX: 'hidden' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />

      {/* LEFT COLUMN: PLAYER & METADATA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Video Player */}
        <div className="video-player-container animate-fade-in" style={{ position: 'relative', overflow: 'hidden' }}>
          
          <video
            ref={videoRef}
            src={srcUrl}
            className="video-player-element"
            onTimeUpdate={handleTimeUpdate}
            onSeeked={handleSeeked}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleVideoEnded}
            onClick={handlePlayPause}
            onContextMenu={(e) => e.preventDefault()}
            controls={false}
            preload="auto"
          />

          {/* Buffering quality overlay spinner */}
          {isQualitySwitching && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 99
            }}>
              <span style={{ fontSize: '32px', animation: 'spin 1s infinite linear', marginBottom: '12px' }}>🌀</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Switching to {quality}...</span>
            </div>
          )}

          {/* Auto Resume Toast Overlay */}
          {savedPositionText && (
            <div style={{
              position: 'absolute',
              bottom: '90px',
              left: '20px',
              background: 'rgba(18, 18, 23, 0.95)',
              border: '1px solid var(--accent-secondary)',
              padding: '16px 20px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              zIndex: 100,
              boxShadow: 'var(--shadow-lg)',
              maxWidth: '320px'
            }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{savedPositionText}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleResume} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  {t('watch.resumeBtn')}
                </button>
                <button onClick={() => setSavedPositionText('')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  {t('watch.startOverBtn')}
                </button>
              </div>
            </div>
          )}

          {/* CUSTOM CONTROLS PANEL */}
          <div className="video-player-controls" style={{ flexWrap: 'wrap', gap: '12px' }}>
            
            {/* Play/Pause */}
            <button 
              onClick={handlePlayPause} 
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', width: '32px' }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            {/* Volume controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button 
                onClick={handleMuteToggle}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
                title={t('watch.volume')}
              >
                {isMuted ? '🔇' : volume < 0.3 ? '🔈' : volume < 0.7 ? '🔉' : '🔊'}
              </button>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(e.target.value)}
                style={{
                  width: '60px',
                  height: '4px',
                  accentColor: 'var(--accent-secondary)',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Rewind 10s */}
            <button 
              onClick={() => handleSeek(-10)} 
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
              title="Seek Back 10s"
            >
              ⏪ 10s
            </button>

            {/* Forward 10s */}
            <button 
              onClick={() => handleSeek(10)} 
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
              title="Seek Forward 10s"
            >
              10s ⏩
            </button>

            {/* Time Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 200px' }}>
              <span style={{ fontSize: '12px', color: '#aaa', minWidth: '35px' }}>{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  if (videoRef.current) videoRef.current.currentTime = e.target.value;
                }}
                onMouseDown={handleTimelineDragStart}
                onTouchStart={handleTimelineDragStart}
                onMouseUp={handleTimelineDragEnd}
                onTouchEnd={handleTimelineDragEnd}
                style={{
                  flex: 1,
                  height: '4px',
                  accentColor: 'var(--accent-primary)',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '12px', color: '#aaa', minWidth: '35px' }}>{formatTime(duration)}</span>
            </div>

            {/* Playback Speed */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#aaa' }}>{t('watch.playbackSpeed')}:</span>
              <PremiumSelect
                options={[
                  { id: '0.5', name: '0.5x' },
                  { id: '1', name: '1.0x' },
                  { id: '1.5', name: '1.5x' },
                  { id: '2', name: '2.0x' }
                ]}
                value={String(playbackSpeed)}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                searchable={false}
                size="small"
                icon="fa-solid fa-gauge-high"
                style={{ width: '76px' }}
                dropUp={true}
              />
            </div>

            {/* Quality Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#aaa' }}>{t('watch.quality')}:</span>
              <PremiumSelect
                options={[
                  { id: 'Auto', name: 'Auto' },
                  { id: '1080p', name: '1080p' },
                  { id: '720p', name: '720p' },
                  { id: '480p', name: '480p' }
                ]}
                value={quality}
                onChange={(e) => handleQualityChange(e.target.value)}
                searchable={false}
                size="small"
                icon="fa-solid fa-sliders"
                style={{ width: '82px' }}
                dropUp={true}
              />
            </div>

            {/* Fullscreen */}
            <button 
              onClick={handleFullscreen} 
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}
              title="Fullscreen"
            >
              🖵
            </button>

          </div>
        </div>

        {/* Widescreen YouTube Details Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
          {/* Large Video Title */}
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{video.title}</h1>
          
          {/* Action and channel row */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '16px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border-color)'
          }} className="watch-engagement-row">
            
            {/* Publisher details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Channel Avatar bubble */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '16px'
              }}>
                LA
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>{video.author || video.instructor || video.client_name || 'LurnAx Education'}</span>
              </div>
              

            </div>

            {/* Engagement buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Like / Dislike pill */}
              <div style={{
                display: 'inline-flex',
                background: 'var(--bg-tertiary)',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '1px solid var(--border-color)'
              }}>
                <button 
                  onClick={() => {
                    if (isLiked) {
                      setIsLiked(false);
                      setLikesCount(prev => prev - 1);
                    } else {
                      setIsLiked(true);
                      setLikesCount(prev => prev + 1);
                      if (isDisliked) setIsDisliked(false);
                    }
                  }}
                  style={{
                    background: isLiked ? 'rgba(255,255,255,0.08)' : 'none',
                    border: 'none',
                    padding: '8px 16px',
                    color: isLiked ? 'var(--accent-secondary)' : 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  👍 {likesCount}
                </button>
                <div style={{ width: '1px', background: 'var(--border-color)' }} />
                <button 
                  onClick={() => {
                    if (isDisliked) {
                      setIsDisliked(false);
                    } else {
                      setIsDisliked(true);
                      if (isLiked) {
                        setIsLiked(false);
                        setLikesCount(prev => prev - 1);
                      }
                    }
                  }}
                  style={{
                    background: isDisliked ? 'rgba(255,255,255,0.08)' : 'none',
                    border: 'none',
                    padding: '8px 16px',
                    color: isDisliked ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  👎
                </button>
              </div>

              {/* Share button */}
              <button style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '8px 16px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }} onClick={() => alert("Link copied to clipboard (Simulated)")}>
                🔗 Share
              </button>

              {/* Download button */}
              <button style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '8px 16px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }} onClick={handleDownloadVideo}>
                📥 Download
              </button>

              {/* Watch Later button */}
              <button style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '8px 16px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }} onClick={handleSaveToWatchLater}>
                🔖 Watch Later
              </button>

              {/* Chapter Quiz Launch Button */}
              {(() => {
                const activeCourse = location.state?.course;
                const chapId = video?.chapter_id ?? video?.chapterId ?? location.state?.chapterId ?? 1;
                const cId = video?.course_id ?? video?.courseId ?? activeCourse?.id ?? 1;
                const quizObj = findQuizForChapter(chapId, activeCourse);

                if (quizObj || location.state?.course) {
                  return (
                    <button 
                      style={{
                        background: 'linear-gradient(135deg, #e50914, #b20710)',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '8px 18px',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(229, 9, 20, 0.35)'
                      }} 
                      onClick={() => triggerQuizForChapter(chapId, cId, activeCourse)}
                    >
                      📝 Take Chapter Quiz
                    </button>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Collapsible Dark Description Box */}
          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            lineHeight: '1.6'
          }} className="watch-description-box">
            <div style={{ fontWeight: 700, marginBottom: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span>{video.views} {t('user.viewsCount')}</span>
              <span>•</span>
              <span>{video.category}</span>
              <span>•</span>
              <span>Published by: {video.uploadedBy === 'u-superadmin' ? 'Super Admin' : 'Admin'}</span>
            </div>
            
            <p style={{ margin: 0, whiteSpace: 'pre-line' }}>
              {video.description || "No description provided for this lesson."}
            </p>

            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {video.tags && video.tags.map((tag, i) => (
                <span key={i} style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: RECOMMENDATIONS OR COURSE PLAYLIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {location.state?.course && getCourseChapters(location.state.course).length > 0 ? (
          (() => {
            const courseChapters = getCourseChapters(location.state.course);
            const courseLessons = getCourseLessonsList(location.state.course);
            const courseTitle = location.state.course.title || location.state.course.course_name || 'Course';
            const courseId = location.state.course.id || location.state.course.course_id || location.state.course.courseId || 1;
            
            // Calculate completion progress
            const currentIdx = courseLessons.findIndex(l => String(l.id || l.videoUrl || l.video_url) === String(video?.id || video?.videoUrl || video?.video_url));
            const completedCount = currentIdx === -1 ? 0 : currentIdx; // Index represents number of lessons watched before this one
            const percent = courseLessons.length > 0 ? Math.round((completedCount / courseLessons.length) * 100) : 0;
            const displayPercent = Math.min(100, Math.max(0, percent));
            
            // SVG Circular Progress Ring math
            const radius = 16;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (displayPercent / 100) * circumference;

            return (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: '380px',
                height: 'calc(100vh - 80px)',
                position: 'sticky',
                top: '20px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}>
                {/* Course Playlist Card Header Box (Fixed at top) */}
                <div style={{ 
                  padding: '14px 16px', 
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)', 
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '15px' }}>📖</span> Course Content
                      </h3>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
                        {courseChapters.length} {courseChapters.length === 1 ? 'Section' : 'Sections'} • {courseLessons.length} {courseLessons.length === 1 ? 'Lesson' : 'Lessons'}
                      </div>
                    </div>
                    {/* Percentage badge */}
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: 'rgba(99, 102, 241, 0.12)',
                      color: '#6366f1',
                      padding: '3px 8px',
                      borderRadius: '12px'
                    }}>
                      {displayPercent}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {completedCount} of {courseLessons.length} completed
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const allExpanded = courseChapters.every((c, i) => (expandedChapters[`chap_${c.id || i}`] ?? true) === true);
                        const nextState = {};
                        courseChapters.forEach((c, i) => {
                          nextState[`chap_${c.id || i}`] = !allExpanded;
                        });
                        setExpandedChapters(nextState);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6366f1',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {courseChapters.every((c, i) => (expandedChapters[`chap_${c.id || i}`] ?? true) === true) ? 'Collapse all' : 'Expand all'}
                    </button>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${displayPercent}%`, height: '100%', background: '#6366f1', borderRadius: '2px' }} />
                  </div>
                </div>

                {/* Chapters & Lessons Accordion List (Scrollable Area) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: '10px',
                  scrollbarWidth: 'thin'
                }}>
                  {courseChapters.map((chapter, chapIdx) => {
                    const chapKey = `chap_${chapter.id || chapIdx}`;
                    // Expanded if not explicitly set to false (default expanded)
                    const isExpanded = expandedChapters[chapKey] !== false;
                    
                    const chapLessons = chapter.lessons || [];
                    const chapCompletedCount = chapLessons.filter(l => {
                      const lGlobalIdx = courseLessons.findIndex(gl => String(gl.id || gl.videoUrl || gl.video_url) === String(l.id || l.videoUrl || l.video_url));
                      return lGlobalIdx !== -1 && lGlobalIdx < completedCount;
                    }).length;

                    const isCurrentChapter = chapLessons.some(l => 
                      String(l.id || l.videoUrl || l.video_url) === String(video?.id || video?.videoUrl || video?.video_url)
                    );

                    const quizObj = findQuizForChapter(chapter.id, location.state?.course);

                    return (
                      <div 
                        key={chapKey}
                        style={{
                          borderRadius: '12px',
                          border: isCurrentChapter ? '1.5px solid rgba(99, 102, 241, 0.45)' : '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          boxShadow: isCurrentChapter ? '0 2px 12px rgba(99, 102, 241, 0.06)' : 'none',
                          transition: 'border-color 0.2s'
                        }}
                      >
                        {/* Chapter Section Header (Udemy Accordion Header) */}
                        <div 
                          onClick={() => toggleChapterExpand(chapKey)}
                          style={{
                            padding: '12px 14px',
                            background: isCurrentChapter ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-tertiary)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '10px',
                            userSelect: 'none',
                            borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontSize: '13px', 
                              fontWeight: '700', 
                              color: isCurrentChapter ? '#6366f1' : 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              Section {chapIdx + 1}: {chapter.title || `Chapter ${chapIdx + 1}`}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {chapCompletedCount} / {chapLessons.length} • {chapLessons.length} {chapLessons.length === 1 ? 'lesson' : 'lessons'}
                            </div>
                          </div>
                          <i 
                            className="fa-solid fa-chevron-down" 
                            style={{ 
                              fontSize: '12px', 
                              color: isCurrentChapter ? '#6366f1' : 'var(--text-secondary)',
                              transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                              transition: 'transform 0.2s ease'
                            }} 
                          />
                        </div>

                        {/* Chapter Lessons List (Collapsible) */}
                        {isExpanded && (
                          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {chapLessons.map((lesson, lIdx) => {
                              const globalIdx = courseLessons.findIndex(gl => String(gl.id || gl.videoUrl || gl.video_url) === String(lesson.id || lesson.videoUrl || lesson.video_url));
                              const isLessonActive = String(lesson.id || lesson.videoUrl || lesson.video_url) === String(video?.id || video?.videoUrl || video?.video_url);
                              const isLocked = isChapterLocked(lesson, location.state?.course);
                              const lessonThumb = lesson.thumbnail || lesson.thumbnailUrl || lesson.thumbnail_url || location.state?.course?.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600';
                              const lessonDuration = lesson.duration || (globalIdx === 0 ? '5:21' : globalIdx === 1 ? '8:45' : globalIdx === 2 ? '6:30' : '7:15');
                              const isCompleted = globalIdx !== -1 && globalIdx < completedCount;

                              return (
                                <div 
                                  key={lesson.id || lIdx}
                                  onClick={() => handleNavigateToVideo(lesson, location.state?.course)}
                                  style={{
                                    display: 'flex',
                                    gap: '10px',
                                    padding: '8px 10px',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    background: isLessonActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                                    border: isLessonActive ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                                    transition: 'background 0.15s ease',
                                    alignItems: 'center'
                                  }}
                                  onMouseEnter={e => {
                                    if (!isLessonActive) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                                  }}
                                  onMouseLeave={e => {
                                    if (!isLessonActive) e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  {/* Status indicator / Checkbox */}
                                  <div style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {isLessonActive ? (
                                      <span style={{ fontSize: '11px', color: '#6366f1' }}>▶</span>
                                    ) : isCompleted ? (
                                      <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 'bold' }}>✓</span>
                                    ) : isLocked ? (
                                      <span style={{ fontSize: '11px', color: '#f59e0b' }}>🔒</span>
                                    ) : (
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1.5px solid var(--text-secondary)' }}></span>
                                    )}
                                  </div>

                                  {/* Thumbnail */}
                                  <div style={{ position: 'relative', width: '64px', height: '38px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                                    <img 
                                      src={lessonThumb} 
                                      alt={lesson.title || `Lesson ${lIdx + 1}`} 
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                    {isLocked && (
                                      <div style={{
                                        position: 'absolute',
                                        top: '2px',
                                        right: '2px',
                                        background: 'rgba(0,0,0,0.7)',
                                        color: '#f59e0b',
                                        padding: '1px 4px',
                                        borderRadius: '4px',
                                        fontSize: '8px',
                                        fontWeight: 'bold'
                                      }}>
                                        PRO
                                      </div>
                                    )}
                                  </div>

                                  {/* Title & Duration */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ 
                                      fontSize: '12px', 
                                      fontWeight: isLessonActive ? '700' : '500', 
                                      color: isLessonActive ? '#6366f1' : 'var(--text-primary)',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      {lesson.title || `Lesson ${lIdx + 1}`}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span><i className="fa-solid fa-circle-play" style={{ fontSize: '9px', marginRight: '3px' }} />{lessonDuration}</span>
                                      {isLessonActive && <span style={{ color: '#6366f1', fontWeight: 700 }}>• Playing</span>}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Chapter Quiz Trigger Button under Chapter */}
                            {(quizObj || location.state?.course?.quizzes) && (
                              <div 
                                onClick={() => triggerQuizForChapter(chapter.id, courseId, location.state?.course)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 12px',
                                  background: 'rgba(229, 9, 20, 0.06)',
                                  border: '1px dashed rgba(229, 9, 20, 0.3)',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  marginTop: '4px',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(229, 9, 20, 0.12)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(229, 9, 20, 0.06)'}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '13px' }}>📝</span>
                                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#e50914' }}>
                                    Section {chapIdx + 1} Quiz Assessment
                                  </div>
                                </div>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  backgroundColor: '#e50914',
                                  color: '#fff',
                                  padding: '2px 8px',
                                  borderRadius: '10px'
                                }}>
                                  Take Quiz
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()
        ) : (
          <>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{t('watch.recommended')}</h3>
            {recommendations.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('watch.noRelatedVideos')} {video?.category}</div>
            ) : (
              recommendations.map(rec => (
                <div 
                  key={rec.id} 
                  onClick={() => handleNavigateToVideo(rec, null)}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    cursor: 'pointer',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    transition: 'transform 0.2s',
                    padding: '8px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <img 
                    src={(() => {
                      const thumb = rec.thumbnail || rec.thumbnailUrl || rec.thumbnail_url || '';
                      if (!thumb) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600';
                      return thumb.startsWith('http') ? thumb : `http://localhost:5000${thumb}`;
                    })()} 
                    alt={rec.title} 
                    style={{ width: '100px', height: '56px', objectFit: 'cover', borderRadius: '4px' }} 
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rec.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {rec.views} {t('user.viewsCount')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* --- CUSTOM UPGRADE ALERT MODAL (Portal to document.body for viewport centering) --- */}
      {customAlert.show && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999,
          animation: 'fadeIn 0.25s ease'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            width: '90%',
            maxWidth: '380px',
            padding: '36px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: '#333333',
            animation: 'scaleIn 0.25s ease',
            position: 'relative'
          }}>
            {/* Crown Circle Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: '3px solid #f59e0b',
              background: 'rgba(245, 158, 11, 0.12)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <span style={{ fontSize: '32px' }}>👑</span>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#111827',
              margin: '0 0 12px 0'
            }}>
              {customAlert.title}
            </h3>

            {/* Message */}
            <p style={{
              fontSize: '14px',
              color: '#4b5563',
              lineHeight: '1.5',
              margin: '0 0 28px 0'
            }}>
              {customAlert.message}
            </p>

            {/* Button */}
            <button
              onClick={() => setCustomAlert(prev => ({ ...prev, show: false }))}
              style={{
                width: '100%',
                padding: '12px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#ffffff',
                border: 'none',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              {customAlert.buttonText}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ================= CHAPTER QUIZ MODAL PORTAL ================= */}
      {quizModal.show && ReactDOM.createPortal(
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
                                {/* Option Radio Circle */}
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
                    background: quizModal.results?.percentage >= 70 
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))'
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
                    border: `1px solid ${quizModal.results?.percentage >= 70 ? '#10b981' : '#ef4444'}`
                  }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '8px' }}>
                      {quizModal.results?.percentage >= 70 ? '🎉' : '📊'}
                    </span>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #ffffff)' }}>
                      Score: {quizModal.results?.score} / {quizModal.results?.totalQuestions} ({quizModal.results?.percentage}%)
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: quizModal.results?.percentage >= 70 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      {quizModal.results?.percentage >= 70 ? 'Congratulations! You passed the chapter quiz.' : 'Quiz completed. Review correct answers below.'}
                    </p>
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
                            {idx + 1}. {ans.question}
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

                        {ans.question_type === '3' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                            <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: ans.is_correct ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${ans.is_correct ? '#10b981' : '#ef4444'}` }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Your Answer: </span>
                              <strong style={{ color: ans.is_correct ? '#10b981' : '#ef4444' }}>{ans.user_answer || '(No answer provided)'}</strong>
                            </div>
                            {!ans.is_correct && (
                              <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Correct Answer: </span>
                                <strong style={{ color: '#10b981' }}>{ans.correct_text}</strong>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                            {(ans.options || []).map((opt, oIdx) => {
                              const isUserChoice = ans.selected_option === oIdx;
                              const isCorrectChoice = ans.correct_option === oIdx;
                              const optText = typeof opt === 'object' ? (opt.text || opt.option_text || JSON.stringify(opt)) : String(opt);

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
              justify: 'space-between',
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
                      disabled={quizModal.userAnswers[quizModal.questions[quizModal.currentIdx]?.id] === undefined}
                      className="btn btn-primary"
                      style={{
                        padding: '8px 24px',
                        fontSize: '13px',
                        backgroundColor: '#e50914',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: quizModal.userAnswers[quizModal.questions[quizModal.currentIdx]?.id] === undefined ? 'not-allowed' : 'pointer',
                        opacity: quizModal.userAnswers[quizModal.questions[quizModal.currentIdx]?.id] === undefined ? 0.5 : 1
                      }}
                    >
                      Next ➔
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={quizModal.isSubmitting || quizModal.userAnswers[quizModal.questions[quizModal.currentIdx]?.id] === undefined}
                      className="btn btn-primary"
                      style={{
                        padding: '8px 24px',
                        fontSize: '13px',
                        backgroundColor: '#10b981',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '8px',
                        fontWeight: 700,
                        cursor: (quizModal.isSubmitting || quizModal.userAnswers[quizModal.questions[quizModal.currentIdx]?.id] === undefined) ? 'not-allowed' : 'pointer',
                        opacity: (quizModal.isSubmitting || quizModal.userAnswers[quizModal.questions[quizModal.currentIdx]?.id] === undefined) ? 0.5 : 1,
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
                    onClick={() => setQuizModal(prev => ({ ...prev, completed: false, currentIdx: 0, userAnswers: {} }))}
                    className="btn btn-secondary"
                    style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    🔄 Retake Quiz
                  </button>
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
      )}
    </div>
  );
};

export default VideoWatch;
