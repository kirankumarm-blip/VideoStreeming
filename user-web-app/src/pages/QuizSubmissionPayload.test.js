describe('Quiz submission payload and API evaluation verification', () => {
  const buildAnswerPayload = (questions, userAnswers) => {
    return questions.map(q => {
      const qType = String(q.question_type || q.questionType || 1);
      const userAns = userAnswers[q.id];
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
  };

  test('passes option_id when options are objects with option_id without frontend scoring', () => {
    const questions = [
      {
        id: 1,
        question: 'What is DK?',
        question_type: '1',
        options: [
          { option_id: 101, option_text: 'DK' },
          { option_id: 102, option_text: 'UK' }
        ],
        correctAnswer: 0
      }
    ];
    const userAnswers = { 1: 0 };
    const answers = buildAnswerPayload(questions, userAnswers);

    expect(answers).toEqual([
      {
        question_id: 1,
        question_type: '1',
        selected_option: 0,
        selected_option_id: 101,
        option_id: 101,
        user_answer: 0,
        selected_text: 'DK'
      }
    ]);
  });

  test('passes option_id when question provides option_ids array for string options', () => {
    const questions = [
      {
        id: 2,
        question: 'Choose option',
        question_type: '1',
        options: ['Option A', 'Option B'],
        option_ids: [501, 502],
        correctAnswer: 1
      }
    ];
    const userAnswers = { 2: 1 };
    const answers = buildAnswerPayload(questions, userAnswers);

    expect(answers).toEqual([
      {
        question_id: 2,
        question_type: '1',
        selected_option: 1,
        selected_option_id: 502,
        option_id: 502,
        user_answer: 1,
        selected_text: 'Option B'
      }
    ]);
  });

  test('passes option_id for fill in the blank questions', () => {
    const questions = [
      {
        id: 3,
        question: 'Fill the blank',
        question_type: '3',
        blank_answer: 'React',
        option_id: 301
      }
    ];
    const userAnswers = { 3: 'React' };
    const answers = buildAnswerPayload(questions, userAnswers);

    expect(answers).toEqual([
      {
        question_id: 3,
        question_type: '3',
        selected_option: 'React',
        selected_option_id: 301,
        option_id: 301,
        user_answer: 'React',
        selected_text: 'React'
      }
    ]);
  });

  test('parses API response array for score, percentage, result, and answers', () => {
    const apiResponse = [
      {
        quiz_id: 1,
        course_id: 1,
        chapter_id: 1,
        score: 2,
        total_questions: 3,
        percentage: 67,
        result: false,
        result_str: 'Failed',
        status: 'Failed',
        passing_percentage: 70,
        correct_count: 2,
        wrong_count: 1,
        answers: [
          {
            question_id: 1,
            question_type: '1',
            question_text: 'Who created java?',
            selected_option_id: 1,
            selected_text: 'Jam',
            correct_option_id: 1,
            correct_answer: 'Jam',
            is_correct: true,
            status: 'Correct',
            options: [
              { option_id: 1, option_text: 'Jam', is_correct: true, is_selected: true },
              { option_id: 2, option_text: 'RAM', is_correct: false, is_selected: false }
            ]
          }
        ]
      }
    ];

    const resData = Array.isArray(apiResponse) && apiResponse.length > 0 ? apiResponse[0] : apiResponse;
    const isPassedBool = Boolean(
      resData?.result === true ||
      String(resData?.result_str).toLowerCase() === 'passed' ||
      String(resData?.status).toLowerCase() === 'passed'
    );

    expect(resData.score).toBe(2);
    expect(resData.total_questions).toBe(3);
    expect(resData.percentage).toBe(67);
    expect(isPassedBool).toBe(false);
    expect(resData.answers[0].is_correct).toBe(true);
    expect(resData.answers[0].options[0].is_correct).toBe(true);
    expect(resData.answers[0].options[0].is_selected).toBe(true);
    expect(resData.answers[0].options[1].is_correct).toBe(false);
    expect(resData.answers[0].options[1].is_selected).toBe(false);
  });

  test('only marks option with is_correct true as correctChoice and avoids index-ID collisions', () => {
    const ans = {
      correct_option_id: 1, // Notice this is 1
      correct_answer: "Jam",
      options: [
        { option_id: 1, option_text: "Jam", is_correct: true, is_selected: true },
        { option_id: 2, option_text: "RAM", is_correct: false, is_selected: false },
        { option_id: 3, option_text: "NAN", is_correct: false, is_selected: false },
        { option_id: 4, option_text: "NEEDN", is_correct: false, is_selected: false }
      ]
    };

    const evaluateChoice = (opt, oIdx) => {
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

      return { isCorrectChoice, isUserChoice };
    };

    // Index 0: Jam (should be correct & user choice)
    expect(evaluateChoice(ans.options[0], 0)).toEqual({ isCorrectChoice: true, isUserChoice: true });

    // Index 1: RAM (should NOT be correct choice even though oIdx === 1 and correct_option_id === 1)
    expect(evaluateChoice(ans.options[1], 1)).toEqual({ isCorrectChoice: false, isUserChoice: false });

    // Index 2: NAN
    expect(evaluateChoice(ans.options[2], 2)).toEqual({ isCorrectChoice: false, isUserChoice: false });

    // Index 3: NEEDN
    expect(evaluateChoice(ans.options[3], 3)).toEqual({ isCorrectChoice: false, isUserChoice: false });
  });
});
