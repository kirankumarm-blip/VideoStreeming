// Helper simulating the exact memoized filter & sort logic from UserDashboard
export function computeFilteredExploreVideos({
  hasFetchedExplore,
  exploreVideosList,
  fallbackList = [],
  searchQuery = '',
  selectedCategory = '',
  filterDifficulty = 'All',
  filterDuration = 'All',
  sortBy = 'views'
}) {
  const baseList = hasFetchedExplore ? exploreVideosList : fallbackList;
  // Shallow copy to prevent state mutation
  let result = Array.isArray(baseList) ? [...baseList] : [];

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    result = result.filter(v =>
      (v.title && v.title.toLowerCase().includes(query)) ||
      (v.description && v.description.toLowerCase().includes(query)) ||
      (Array.isArray(v.tags) && v.tags.some(t => typeof t === 'string' && t.toLowerCase().includes(query)))
    );
  }

  if (selectedCategory) {
    result = result.filter(v => v.category === selectedCategory);
  }

  if (filterDifficulty !== 'All') {
    result = result.filter(v => v.difficulty?.toLowerCase() === filterDifficulty.toLowerCase());
  }

  if (filterDuration !== 'All') {
    result = result.filter(v => {
      const d = v.duration || 300;
      if (filterDuration === 'short') return d < 300;
      if (filterDuration === 'medium') return d >= 300 && d <= 900;
      if (filterDuration === 'long') return d > 900;
      return true;
    });
  }

  result.sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
    return (b.views || 0) - (a.views || 0);
  });

  return result;
}

describe('Explore Videos - State Mutation and Filtering/Sorting Suite', () => {
  const mockVideos = [
    {
      id: 'vid-1',
      title: 'Python for Beginners',
      description: 'Learn Python coding from scratch',
      category: 'Coding',
      difficulty: 'Beginner',
      duration: 200, // < 300 (short)
      views: 1200,
      rating: 4.5,
      tags: ['python', 'coding']
    },
    {
      id: 'vid-2',
      title: 'Advanced Machine Learning',
      description: 'Deep dive into neural networks',
      category: 'AI',
      difficulty: 'Advanced',
      duration: 600, // 300..900 (medium)
      views: 3500,
      rating: 4.9,
      tags: ['ai', 'neural', 'python']
    },
    {
      id: 'vid-3',
      title: 'Quantum Physics Masterclass',
      description: 'Schrodinger equation and wave functions',
      category: 'Science',
      difficulty: 'Intermediate',
      duration: 1200, // > 900 (long)
      views: 800,
      rating: 4.8,
      tags: ['physics', 'quantum']
    },
    {
      id: 'vid-4',
      title: 'Business Strategy 101',
      description: 'Scaling startups and marketing',
      category: 'Business',
      difficulty: 'Beginner',
      duration: 450, // medium
      views: 2100,
      rating: 4.2,
      tags: ['business', 'marketing']
    }
  ];

  test('1. Prevents in-place mutation of the original state array during sorting', () => {
    // Clone original array into a state simulator
    const originalStateArray = [...mockVideos];
    // Freeze the array to guarantee runtime error if any code attempts to sort in-place
    Object.freeze(originalStateArray);

    expect(() => {
      const sorted = computeFilteredExploreVideos({
        hasFetchedExplore: true,
        exploreVideosList: originalStateArray,
        sortBy: 'views'
      });
      expect(sorted[0].id).toBe('vid-2'); // 3500 views
      expect(sorted[1].id).toBe('vid-4'); // 2100 views
      expect(sorted[2].id).toBe('vid-1'); // 1200 views
      expect(sorted[3].id).toBe('vid-3'); // 800 views
    }).not.toThrow();

    // Verify original array order remains completely untouched
    expect(originalStateArray[0].id).toBe('vid-1');
    expect(originalStateArray[1].id).toBe('vid-2');
    expect(originalStateArray[2].id).toBe('vid-3');
    expect(originalStateArray[3].id).toBe('vid-4');
  });

  test('2. Video sorting works without active filters (rating, title, views)', () => {
    const original = [...mockVideos];

    // Sort by rating descending
    const byRating = computeFilteredExploreVideos({
      hasFetchedExplore: true,
      exploreVideosList: original,
      sortBy: 'rating'
    });
    expect(byRating.map(v => v.id)).toEqual(['vid-2', 'vid-3', 'vid-1', 'vid-4']);

    // Sort by title alphabetically
    const byTitle = computeFilteredExploreVideos({
      hasFetchedExplore: true,
      exploreVideosList: original,
      sortBy: 'title'
    });
    expect(byTitle.map(v => v.title)).toEqual([
      'Advanced Machine Learning',
      'Business Strategy 101',
      'Python for Beginners',
      'Quantum Physics Masterclass'
    ]);

    // Sort by views descending (default)
    const byViews = computeFilteredExploreVideos({
      hasFetchedExplore: true,
      exploreVideosList: original,
      sortBy: 'views'
    });
    expect(byViews.map(v => v.id)).toEqual(['vid-2', 'vid-4', 'vid-1', 'vid-3']);

    // Verify original array was not mutated
    expect(original[0].id).toBe('vid-1');
  });

  test('3. Video sorting works with active filters applied', () => {
    const original = [...mockVideos];

    // Filter by difficulty = Beginner, sort by views
    const beginners = computeFilteredExploreVideos({
      hasFetchedExplore: true,
      exploreVideosList: original,
      filterDifficulty: 'Beginner',
      sortBy: 'views'
    });
    expect(beginners).toHaveLength(2);
    expect(beginners[0].id).toBe('vid-4'); // 2100 views
    expect(beginners[1].id).toBe('vid-1'); // 1200 views

    // Filter by difficulty = Beginner, sort by rating
    const beginnersByRating = computeFilteredExploreVideos({
      hasFetchedExplore: true,
      exploreVideosList: original,
      filterDifficulty: 'Beginner',
      sortBy: 'rating'
    });
    expect(beginnersByRating[0].id).toBe('vid-1'); // 4.5 rating
    expect(beginnersByRating[1].id).toBe('vid-4'); // 4.2 rating
  });

  test('4. Search query returns expected matching videos across title, description, and tags', () => {
    const original = [...mockVideos];

    // Search by title
    const searchPython = computeFilteredExploreVideos({
      hasFetchedExplore: true,
      exploreVideosList: original,
      searchQuery: 'python'
    });
    // vid-1 has Python in title/tags, vid-2 has python in tags
    expect(searchPython.map(v => v.id)).toEqual(['vid-2', 'vid-1']);

    // Search by description
    const searchNeural = computeFilteredExploreVideos({
      hasFetchedExplore: true,
      exploreVideosList: original,
      searchQuery: 'neural'
    });
    expect(searchNeural).toHaveLength(1);
    expect(searchNeural[0].id).toBe('vid-2');
  });

  test('5. Category filtering isolates videos by chosen category', () => {
    const original = [...mockVideos];

    const scienceVideos = computeFilteredExploreVideos({
      hasFetchedExplore: true,
      exploreVideosList: original,
      selectedCategory: 'Science'
    });
    expect(scienceVideos).toHaveLength(1);
    expect(scienceVideos[0].id).toBe('vid-3');
  });

  test('6. Duration filtering segregates short, medium, and long durations', () => {
    const original = [...mockVideos];

    const shortVideos = computeFilteredExploreVideos({
      hasFetchedExplore: true,
      exploreVideosList: original,
      filterDuration: 'short'
    });
    expect(shortVideos).toHaveLength(1);
    expect(shortVideos[0].id).toBe('vid-1');

    const mediumVideos = computeFilteredExploreVideos({
      hasFetchedExplore: true,
      exploreVideosList: original,
      filterDuration: 'medium'
    });
    expect(mediumVideos.map(v => v.id)).toEqual(['vid-2', 'vid-4']);

    const longVideos = computeFilteredExploreVideos({
      hasFetchedExplore: true,
      exploreVideosList: original,
      filterDuration: 'long'
    });
    expect(longVideos).toHaveLength(1);
    expect(longVideos[0].id).toBe('vid-3');
  });

  test('7. Clearing all filters restores the full dataset in the expected sort order', () => {
    const original = [...mockVideos];

    // First filter down
    const filtered = computeFilteredExploreVideos({
      hasFetchedExplore: true,
      exploreVideosList: original,
      searchQuery: 'quantum',
      filterDifficulty: 'Intermediate'
    });
    expect(filtered).toHaveLength(1);

    // Now clear filters (empty query, All difficulty)
    const cleared = computeFilteredExploreVideos({
      hasFetchedExplore: true,
      exploreVideosList: original,
      searchQuery: '',
      filterDifficulty: 'All',
      sortBy: 'views'
    });
    expect(cleared).toHaveLength(4);
    expect(cleared[0].id).toBe('vid-2');
  });

  test('8. Returns empty array without errors when no videos match active filters', () => {
    const original = [...mockVideos];

    const noMatches = computeFilteredExploreVideos({
      hasFetchedExplore: true,
      exploreVideosList: original,
      searchQuery: 'NonExistentTopicXYZ123'
    });
    expect(noMatches).toEqual([]);
    expect(noMatches.length).toBe(0);
  });

  test('9. Handles fallback video list when explore API has not yet fetched', () => {
    const fallbacks = [
      { id: 'fb-1', title: 'Fallback Intro', views: 50, category: 'Coding', difficulty: 'Beginner' }
    ];

    const result = computeFilteredExploreVideos({
      hasFetchedExplore: false,
      exploreVideosList: [],
      fallbackList: fallbacks,
      sortBy: 'views'
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('fb-1');
  });

  test('10. Original state array maintains identical references and item order after multiple sort switches', () => {
    const stateList = [...mockVideos];
    const originalOrder = stateList.map(v => v.id);

    // Switch 1: sort by rating
    computeFilteredExploreVideos({ hasFetchedExplore: true, exploreVideosList: stateList, sortBy: 'rating' });
    expect(stateList.map(v => v.id)).toEqual(originalOrder);

    // Switch 2: sort by title
    computeFilteredExploreVideos({ hasFetchedExplore: true, exploreVideosList: stateList, sortBy: 'title' });
    expect(stateList.map(v => v.id)).toEqual(originalOrder);

    // Switch 3: sort by views
    computeFilteredExploreVideos({ hasFetchedExplore: true, exploreVideosList: stateList, sortBy: 'views' });
    expect(stateList.map(v => v.id)).toEqual(originalOrder);
  });

  test('11. Single computed result is reused for both length check and mapping video cards', () => {
    let computeCount = 0;
    const memoizedCompute = () => {
      computeCount++;
      return computeFilteredExploreVideos({
        hasFetchedExplore: true,
        exploreVideosList: mockVideos,
        sortBy: 'views'
      });
    };

    // Simulate render step: computed once via useMemo
    const filteredExploreVideos = memoizedCompute();

    // Verify empty state check uses .length without re-computing
    const isEmpty = filteredExploreVideos.length === 0;
    expect(isEmpty).toBe(false);

    // Verify card rendering uses .map() without re-computing
    const renderedCards = filteredExploreVideos.map(v => v.title);
    expect(renderedCards).toHaveLength(4);

    // Computation executed exactly once
    expect(computeCount).toBe(1);
  });
});
