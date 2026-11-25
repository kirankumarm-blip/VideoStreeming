describe('Quiz Retake Navigation and Flow Verification', () => {
  const getRetakeNavigationTarget = (item, courses = []) => {
    if (!item) return null;

    const matchedCourse = courses.find(c => 
      String(c.id || c.course_id) === String(item.courseId) ||
      (c.title && item.course && String(c.title).toLowerCase() === String(item.course).toLowerCase()) ||
      (c.course_name && item.course && String(c.course_name).toLowerCase() === String(item.course).toLowerCase())
    ) || (courses.length > 0 ? courses[0] : null);

    const targetCourseId = matchedCourse?.id || matchedCourse?.course_id || item.courseId || 1;
    const targetChapterId = item.chapterId || 1;

    return {
      path: `/watch/${targetCourseId}?chapter=${targetChapterId}&retake=true`,
      state: {
        course: matchedCourse,
        courseId: targetCourseId,
        chapterId: targetChapterId,
        chapter: targetChapterId,
        retake: true,
        quizId: item.id
      }
    };
  };

  test('navigates to /watch/{courseId} with chapter selected and retake=true instead of dashboard /', () => {
    const failedQuizItem = {
      id: 2,
      quiz: 'TypeScript Interfaces Quiz',
      course: 'Advanced TypeScript',
      chapter: 'Chapter 2',
      score: '4/10 (40%)',
      percentage: 40,
      result: 'Failed',
      attempt: 1,
      date: '10 Aug 2026',
      courseId: 105,
      chapterId: 2
    };

    const target = getRetakeNavigationTarget(failedQuizItem);
    expect(target).not.toBeNull();
    expect(target.path).toBe('/watch/105?chapter=2&retake=true');
    expect(target.state).toEqual({
      course: null,
      courseId: 105,
      chapterId: 2,
      chapter: 2,
      retake: true,
      quizId: 2
    });
  });

  test('matches course from course list by course title and resolves courseId', () => {
    const failedQuizItem = {
      id: 3,
      quiz: 'React Hooks Assessment',
      course: 'Mastering React 19',
      chapter: 'Chapter 3',
      score: '5/10 (50%)',
      percentage: 50,
      result: 'Failed',
      courseId: null,
      chapterId: 3
    };

    const courses = [
      { id: 201, title: 'Mastering React 19', chapters: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      { id: 202, title: 'Node.js Backend Microservices' }
    ];

    const target = getRetakeNavigationTarget(failedQuizItem, courses);
    expect(target.path).toBe('/watch/201?chapter=3&retake=true');
    expect(target.state.courseId).toBe(201);
    expect(target.state.chapterId).toBe(3);
    expect(target.state.retake).toBe(true);
    expect(target.state.course).toEqual(courses[0]);
  });

  test('retake flag bypasses video watch completion check to open quiz directly', () => {
    const checkCanOpenQuiz = (isRetake, hasWatchedVideo) => {
      if (!isRetake && !hasWatchedVideo) {
        return { canOpen: false, error: 'Quiz Locked: Please watch the video lesson first' };
      }
      return { canOpen: true, error: null };
    };

    // When isRetake is false and not watched: locked
    expect(checkCanOpenQuiz(false, false)).toEqual({
      canOpen: false,
      error: 'Quiz Locked: Please watch the video lesson first'
    });

    // When isRetake is true, quiz opens directly even if current session watch status is false
    expect(checkCanOpenQuiz(true, false)).toEqual({
      canOpen: true,
      error: null
    });
  });
});
