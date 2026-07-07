/**
 * Static demo data shown to ghost (unauthenticated) users so the app
 * feels alive instead of empty. These never hit the backend.
 */

const now = new Date();
const daysAgo = (n) => new Date(now.getTime() - n * 86400000).toISOString();
const hoursFromNow = (n) => new Date(now.getTime() + n * 3600000).toISOString();

export const GHOST_NOTES = [
  {
    _id: "ghost-note-1",
    title: "Getting Started with CubicNotes",
    subheading: "Your personal knowledge hub",
    content: "# Welcome to CubicNotes\n\nCubicNotes helps you **capture**, **organize**, and **retrieve** your thoughts effortlessly.\n\n## Key Features\n- 📝 Rich Markdown notes with live preview\n- 📁 Notebooks for organized collections\n- ✅ Tasks with priorities and subtasks\n- ⏰ Smart reminders with calendar view\n- 🤖 Gemini AI for summaries and drafts\n\n> \"Your mind is for having ideas, not holding them.\" — David Allen",
    tags: ["welcome", "getting-started"],
    accent: "var(--accent-teal)",
    isPinned: true,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(0),
  },
  {
    _id: "ghost-note-2",
    title: "Meeting Notes — Q3 Planning",
    subheading: "Product roadmap sync",
    content: "## Attendees\nAlice, Bob, Charlie\n\n## Action Items\n1. Finalize feature spec by Friday\n2. Design review next Monday\n3. Sprint planning on Wednesday\n\n## Key Decisions\n- Prioritize mobile-responsive layouts\n- Integrate AI summarization into editor\n- Launch beta by end of Q3",
    tags: ["meetings", "work"],
    accent: "var(--accent-purple)",
    isPinned: false,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  },
  {
    _id: "ghost-note-3",
    title: "Book Notes — Atomic Habits",
    subheading: "James Clear",
    content: "## Core Ideas\n\n**Habit stacking**: Link a new habit to an existing one.\n\n**The 2-minute rule**: Scale any habit down to 2 minutes.\n\n**Environment design**: Make good habits obvious and bad habits invisible.\n\n> \"You do not rise to the level of your goals. You fall to the level of your systems.\"",
    tags: ["books", "self-improvement"],
    accent: "var(--accent-amber)",
    isPinned: false,
    createdAt: daysAgo(7),
    updatedAt: daysAgo(2),
  },
  {
    _id: "ghost-note-4",
    title: "Recipe — Pasta Aglio e Olio",
    subheading: "15-min weeknight dinner",
    content: "## Ingredients\n- 400g spaghetti\n- 6 cloves garlic, thinly sliced\n- 1/2 cup olive oil\n- 1 tsp red pepper flakes\n- Fresh parsley, chopped\n- Parmesan cheese\n\n## Steps\n1. Cook pasta al dente, reserve 1 cup pasta water\n2. Sauté garlic in olive oil until golden\n3. Add pepper flakes\n4. Toss pasta with garlic oil, add pasta water to emulsify\n5. Garnish with parsley and parmesan",
    tags: ["recipes", "cooking"],
    accent: "var(--accent-coral)",
    isPinned: false,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(4),
  },
];

export const GHOST_NOTEBOOKS = [
  {
    _id: "ghost-nb-1",
    name: "Work Projects",
    description: "Client deliverables and internal projects",
    accent: "var(--accent-teal)",
    pageCount: 2,
    createdAt: daysAgo(14),
    updatedAt: daysAgo(1),
  },
  {
    _id: "ghost-nb-2",
    name: "Personal Journal",
    description: "Daily reflections and gratitude logs",
    accent: "var(--accent-purple)",
    pageCount: 1,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(0),
  },
  {
    _id: "ghost-nb-3",
    name: "Learning & Courses",
    description: "Notes from online courses and tutorials",
    accent: "var(--accent-amber)",
    pageCount: 1,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(3),
  },
];

export const GHOST_TASKS = [
  {
    _id: "ghost-task-1",
    title: "Review pull request #42",
    priority: "high",
    isCompleted: false,
    subtasks: [
      { _id: "st-1", text: "Check code quality", completed: true },
      { _id: "st-2", text: "Run test suite", completed: false },
    ],
    createdAt: daysAgo(1),
    updatedAt: daysAgo(0),
  },
  {
    _id: "ghost-task-2",
    title: "Prepare presentation slides",
    priority: "high",
    isCompleted: false,
    subtasks: [],
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    _id: "ghost-task-3",
    title: "Buy groceries for the week",
    priority: "medium",
    isCompleted: false,
    subtasks: [
      { _id: "st-3", text: "Fruits & vegetables", completed: false },
      { _id: "st-4", text: "Dairy & eggs", completed: false },
    ],
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
  {
    _id: "ghost-task-4",
    title: "Schedule dentist appointment",
    priority: "low",
    isCompleted: false,
    subtasks: [],
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  },
  {
    _id: "ghost-task-5",
    title: "Send invoice to client",
    priority: "high",
    isCompleted: true,
    subtasks: [],
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  },
  {
    _id: "ghost-task-6",
    title: "Update portfolio website",
    priority: "medium",
    isCompleted: true,
    subtasks: [],
    createdAt: daysAgo(8),
    updatedAt: daysAgo(3),
  },
];

export const GHOST_REMINDERS = [
  {
    _id: "ghost-rem-1",
    title: "Team standup call",
    description: "Daily sync with the dev team",
    dateTime: hoursFromNow(2),
    isRead: false,
    createdAt: daysAgo(1),
  },
  {
    _id: "ghost-rem-2",
    title: "Submit expense report",
    description: "Monthly expenses due by EOD",
    dateTime: hoursFromNow(5),
    isRead: false,
    createdAt: daysAgo(0),
  },
  {
    _id: "ghost-rem-3",
    title: "Water the plants",
    description: "",
    triggerTime: hoursFromNow(8),
    isRead: false,
    createdAt: daysAgo(2),
  },
];

/** Pre-computed dashboard counts for ghost mode */
export const GHOST_COUNTS = {
  notes: GHOST_NOTES.length,
  notebooks: GHOST_NOTEBOOKS.length,
  tasks: GHOST_TASKS.filter((t) => !t.isCompleted).length,
  reminders: GHOST_REMINDERS.length,
};

export const GHOST_PAGES = {
  "ghost-nb-1": [
    {
      _id: "ghost-p-1",
      title: "Project Alpha Overview",
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Project Alpha Overview" }] },
          { type: "paragraph", content: [{ type: "text", text: "This is a placeholder page content inside the demo Work Projects notebook. Feel free to browse through it." }] }
        ]
      },
      notebookId: "ghost-nb-1",
      createdAt: daysAgo(5),
    },
    {
      _id: "ghost-p-2",
      title: "Sprint Goals",
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Sprint Goals" }] },
          { type: "paragraph", content: [{ type: "text", text: "Focus for this sprint is implementing ghost mode browsing with Action Gates." }] }
        ]
      },
      notebookId: "ghost-nb-1",
      createdAt: daysAgo(3),
    }
  ],
  "ghost-nb-2": [
    {
      _id: "ghost-p-3",
      title: "Daily Log — June 15",
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Finished the dashboard design. Moving heatmap section to the settings page next." }] }
        ]
      },
      notebookId: "ghost-nb-2",
      createdAt: daysAgo(10),
    }
  ],
  "ghost-nb-3": [
    {
      _id: "ghost-p-4",
      title: "React Design Patterns",
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "React Design Patterns" }] },
          { type: "paragraph", content: [{ type: "text", text: "Notes on compound components, render props, and custom hooks patterns in modern React." }] }
        ]
      },
      notebookId: "ghost-nb-3",
      createdAt: daysAgo(8),
    }
  ]
};

export const GHOST_TRASHED_NOTES = [
  {
    _id: "ghost-trash-n-1",
    title: "Obsolete Draft note",
    subheading: "Old ideas to delete",
    content: "This note was moved to the trash bin. Guests can browse items in the trash, but attempting to restore or permanently delete them will ask you to login.",
    tags: ["junk"],
    accent: "var(--accent-coral)",
    createdAt: daysAgo(15),
    updatedAt: daysAgo(8),
  }
];

export const GHOST_TRASHED_TASKS = [
  {
    _id: "ghost-trash-t-1",
    title: "Old task that was cancelled",
    priority: "low",
    isCompleted: false,
    subtasks: [],
    createdAt: daysAgo(10),
    updatedAt: daysAgo(6),
  }
];

// Generate mock activity data for the last 180 days dynamically
export const generateGhostActivity = () => {
  const activity = {};
  let notesCount = 0;
  let tasksCount = 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate activities with a realistic distribution over the last 180 days
  for (let i = 180; i >= 0; i--) {
    // 35% chance of activity on any given day
    if (Math.random() < 0.35) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const pad = (n) => String(n).padStart(2, "0");
      const dateStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;
      
      const count = Math.floor(Math.random() * 4) + 1; // 1 to 4 actions
      activity[dateStr] = count;
      
      // Breakdown distribution
      for (let j = 0; j < count; j++) {
        if (Math.random() < 0.4) {
          notesCount++;
        } else {
          tasksCount++;
        }
      }
    }
  }

  return {
    activity,
    breakdown: {
      notes: notesCount,
      tasks: tasksCount
    }
  };
};
