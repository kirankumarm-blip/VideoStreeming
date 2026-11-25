import { parseQuizFromApi } from './AdminDashboard';

describe('Quiz Parser and Validation (Blocking on Missing/Invalid Correct Options)', () => {
  test('returns null when rawQuiz is null, undefined, or empty', () => {
    expect(parseQuizFromApi(null)).toBeNull();
    expect(parseQuizFromApi(undefined)).toBeNull();
    expect(parseQuizFromApi([])).toBeNull();
    expect(parseQuizFromApi({})).toBeNull();
    expect(parseQuizFromApi({ questions: [] })).toBeNull();
  });

  test('successfully parses a valid MCQ quiz with is_correct: true on an option', () => {
    const rawQuiz = {
      title: 'Chapter 1 Quiz',
      questions: [
        {
          id: 101,
          question: 'What is React?',
          options: [
            { id: 1, text: 'A database', is_correct: false },
            { id: 2, text: 'A UI library', is_correct: true },
            { id: 3, text: 'An OS', is_correct: false },
            { id: 4, text: 'A browser', is_correct: false }
          ]
        }
      ]
    };

    const parsed = parseQuizFromApi(rawQuiz, 'Chapter 1');
    expect(parsed).not.toBeNull();
    expect(parsed.questions.length).toBe(1);
    expect(parsed.questions[0].correctAnswer).toBe(1);
    expect(parsed.questions[0].options[1].text).toBe('A UI library');
  });

  test('successfully parses a valid MCQ quiz with matching correct_option_id', () => {
    const rawQuiz = {
      title: 'Chapter 2 Quiz',
      questions: [
        {
          id: 201,
          question: 'What is JSX?',
          correct_option_id: 'opt-3',
          options: [
            { id: 'opt-1', text: 'Java Syntax XML' },
            { id: 'opt-2', text: 'JSON XML' },
            { id: 'opt-3', text: 'JavaScript XML' },
            { id: 'opt-4', text: 'Just Syntax Extension' }
          ]
        }
      ]
    };

    const parsed = parseQuizFromApi(rawQuiz, 'Chapter 2');
    expect(parsed).not.toBeNull();
    expect(parsed.questions[0].correctAnswer).toBe(2);
  });

  test('successfully parses a valid MCQ quiz with numeric correctAnswer index', () => {
    const rawQuiz = {
      questions: [
        {
          question: 'Sample Question',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 2
        }
      ]
    };

    const parsed = parseQuizFromApi(rawQuiz, 'Chapter 1');
    expect(parsed.questions[0].correctAnswer).toBe(2);
  });

  test('throws a blocking validation error naming chapter and question when correct option is missing (-1)', () => {
    const rawQuiz = {
      title: 'Chapter 1 Quiz',
      questions: [
        {
          id: 301,
          question: 'Question with no answer key',
          options: [
            { id: 1, text: 'Alpha', is_correct: false },
            { id: 2, text: 'Beta', is_correct: false },
            { id: 3, text: 'Gamma', is_correct: false },
            { id: 4, text: 'Delta', is_correct: false }
          ]
        }
      ]
    };

    expect(() => parseQuizFromApi(rawQuiz, 'Chapter 1')).toThrow(
      'Chapter 1: Question 1: no valid correct option'
    );
  });

  test('refuses to quietly fallback to Option A (correctIdx = 0) when answer key is unreadable', () => {
    const rawQuiz = {
      questions: [
        {
          question: 'Question with corrupted answer text',
          options: ['Red', 'Green', 'Blue', 'Yellow'],
          answer: 'Purple' // does not match any option
        }
      ]
    };

    expect(() => parseQuizFromApi(rawQuiz, 'Chapter 3')).toThrow(
      'Chapter 3: Question 1: no valid correct option'
    );
  });

  test('throws a blocking validation error when correct index is out of bounds (>= options length)', () => {
    const rawQuiz = {
      questions: [
        {
          question: 'Question with out-of-range index',
          options: ['Red', 'Green', 'Blue', 'Yellow'],
          correctAnswer: 4 // options length is 4, valid indices are 0..3
        }
      ]
    };

    expect(() => parseQuizFromApi(rawQuiz, 'Chapter 4')).toThrow(
      'Chapter 4: Question 1: no valid correct option'
    );
  });

  test('throws a blocking validation error naming the second question when only the second question is invalid', () => {
    const rawQuiz = {
      questions: [
        {
          question: 'First question (valid)',
          options: ['One', 'Two', 'Three', 'Four'],
          correctAnswer: 0
        },
        {
          question: 'Second question (invalid)',
          options: ['Five', 'Six', 'Seven', 'Eight'],
          correctAnswer: 99 // invalid index
        }
      ]
    };

    expect(() => parseQuizFromApi(rawQuiz, 'Chapter 5')).toThrow(
      'Chapter 5: Question 2: no valid correct option'
    );
  });

  test('uses default "Chapter: " prefix if defaultChapterTitle is omitted', () => {
    const rawQuiz = {
      questions: [
        {
          question: 'Question without chapter title parameter',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: -1
        }
      ]
    };

    expect(() => parseQuizFromApi(rawQuiz)).toThrow(
      'Chapter: Question 1: no valid correct option'
    );
  });

  test('does not throw for valid True/False question (type: "2")', () => {
    const rawQuiz = {
      questions: [
        {
          question: 'The sky is blue',
          type: '2',
          tfAnswer: 'true'
        }
      ]
    };

    const parsed = parseQuizFromApi(rawQuiz, 'Chapter 6');
    expect(parsed).not.toBeNull();
    expect(parsed.questions[0].type).toBe('2');
    expect(parsed.questions[0].tfAnswer).toBe('true');
  });

  test('does not throw for valid Fill in the Blank question (type: "3")', () => {
    const rawQuiz = {
      questions: [
        {
          question: 'The capital of France is ______',
          type: '3',
          blankAnswer: 'Paris'
        }
      ]
    };

    const parsed = parseQuizFromApi(rawQuiz, 'Chapter 7');
    expect(parsed).not.toBeNull();
    expect(parsed.questions[0].type).toBe('3');
    expect(parsed.questions[0].blankAnswer).toBe('Paris');
  });
});
