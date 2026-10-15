export const FALLBACK_LIVE_CLASSES = [
  {
    id: 'LIVE-101',
    title: 'Fullstack Systems & WebRTC Streaming Architecture',
    instructor: 'Dr. Alice Carter',
    instructorRole: 'Lead Systems Architect',
    category: 'Technology',
    status: 'live',
    scheduledAt: new Date().toISOString(),
    durationMinutes: 60,
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
    description: 'Deep dive into collaborative state, WebRTC peer signaling, interactive doubts, and high-throughput video delivery systems.',
    attendeesCount: 42,
    attendees: [],
    handRaises: [
      { id: 'hr-1', studentId: 'student-201', studentName: 'Rohan Sharma', avatar: '🧑‍💻', time: '11:04 AM' }
    ],
    activePoll: {
      id: 'poll-1',
      question: 'Which real-time protocol is best for low-latency live webcasting?',
      options: [
        { id: 'opt-1', text: 'WebRTC (Ultra-low sub-500ms latency)', votes: 24 },
        { id: 'opt-2', text: 'Low-Latency HLS (LL-HLS)', votes: 12 },
        { id: 'opt-3', text: 'WebSocket Binary Chunking', votes: 6 }
      ],
      totalVotes: 42,
      status: 'active'
    },
    chatMessages: [
      { id: 1, sender: 'Dr. Alice Carter', role: 'instructor', text: 'Welcome learners! We are live. Feel free to ask questions or raise your hand ✋.', timeStr: '11:01 AM' },
      { id: 2, sender: 'Rohan Sharma', role: 'student', text: 'Excited for today’s session! Audio and video are crystal clear.', timeStr: '11:05 AM' },
      { id: 3, sender: 'Ananya Roy', role: 'student', text: 'Is WebRTC peer connection established directly or via SFU?', timeStr: '11:10 AM' }
    ]
  },
  {
    id: 'LIVE-102',
    title: 'Quantum Computing: Qubits, Superposition & Post-Quantum Crypto',
    instructor: 'Prof. Vikram Sen',
    instructorRole: 'Quantum Research Fellow',
    category: 'Science',
    status: 'upcoming',
    scheduledAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
    durationMinutes: 90,
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
    description: 'Explore quantum gates, Bloch spheres, entanglement, and how quantum key distribution is revolutionizing cybersecurity.',
    attendeesCount: 28,
    attendees: [],
    handRaises: [],
    activePoll: null,
    chatMessages: []
  },
  {
    id: 'LIVE-103',
    title: 'UI/UX Design Systems & Motion Physics Workshop',
    instructor: 'Sarah Jenkins',
    instructorRole: 'Principal UX Director',
    category: 'Design',
    status: 'completed',
    scheduledAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 75,
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800',
    description: 'Recorded session: crafting cohesive design tokens, fluid spring physics, and accessible contrast patterns.',
    attendeesCount: 94,
    attendees: [],
    handRaises: [],
    activePoll: null,
    chatMessages: []
  }
];
