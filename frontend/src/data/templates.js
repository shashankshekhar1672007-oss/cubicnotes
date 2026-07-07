/**
 * Smart Notebook Templates library
 */
export const NOTE_TEMPLATES = [
  {
    id: "blank",
    name: "Blank Canvas",
    icon: "fa-file",
    color: "#6b7280",
    description: "Start fresh with a clean, unformatted workspace.",
    title: "",
    subheading: "",
    tags: [],
    content: ""
  },
  {
    id: "daily-planner",
    name: "Daily Planner",
    icon: "fa-calendar-day",
    color: "#0ea98a",
    description: "Plan your day with key objectives, task checklists, and reflection.",
    title: "Daily Planner - {{date}}",
    subheading: "Focus, schedule, and task lists for today",
    tags: ["daily", "planner"],
    content: `## 🌅 Focus of the Day
- [ ] Complete the most important task of the day
- [ ] Focus item #2

## 📅 Today's Schedule
- **09:00 AM** - Morning Standup
- **10:00 AM** - Focus block / Deep Work
- **01:00 PM** - Lunch & Break
- **02:00 PM** - Review session / Syncs
- **04:30 PM** - Wrap up & Plan tomorrow

## 📝 Tasks & Checklist
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## 🧠 End of Day Reflection
- **What went well today?**
- **What did I learn?**
- **How can I improve tomorrow?**`
  },
  {
    id: "meeting-minutes",
    name: "Meeting Minutes",
    icon: "fa-users",
    color: "#3b82f6",
    description: "Capture attendees, objectives, discussions, and clear action items.",
    title: "Meeting: {{topic}}",
    subheading: "Key decisions and actions from today's session",
    tags: ["meeting", "minutes"],
    content: `## 👥 Attendees
- [ ] Name 1 (Host)
- [ ] Name 2
- [ ] Name 3

## 🎯 Meeting Objective
Brief summary of the focus of this sync.

## 📝 Discussions & Notes
- Major topic A details
- Core feedback and input
- Challenges identified

## 💡 Decisions Made
- [x] Approved design proposal A
- [ ] Decision B (postponed until review)

## 🚀 Action Items
- [ ] @Name - Task A (Due date)
- [ ] @Name - Task B (Due date)`
  },
  {
    id: "weekly-journal",
    name: "Weekly Journal",
    icon: "fa-book-open",
    color: "#a855f7",
    description: "Reflect on your weekly wins, challenges, and plan upcoming priorities.",
    title: "Weekly Review - Week {{week}}",
    subheading: "Reflections, streak tracking, and goals",
    tags: ["weekly", "journal"],
    content: `## 🌟 Weekly Highlights & Wins
- Highlight 1
- Highlight 2
- Highlight 3

## 🚧 Challenges & Solutions
- Detail the challenges you faced and how you overcame them.

## 📊 Goal Progress Review
- Goal 1: [x] Completed
- Goal 2: [ ] In Progress

## 🎯 Priorities for Next Week
- [ ] Priority 1
- [ ] Priority 2
- [ ] Priority 3`
  },
  {
    id: "project-roadmap",
    name: "Project Roadmap",
    icon: "fa-route",
    color: "#f59e0b",
    description: "Track overview details, timeline phases, and milestones of a project.",
    title: "Project Roadmap: {{project}}",
    subheading: "Milestones, phases, and roadmap deliverables",
    tags: ["project", "roadmap"],
    content: `## 📋 Project Overview
Provide a brief summary of the project goals, target audience, and success metrics.

## 🗺️ Timeline Phases

### Phase 1: Research & Scope (Q1)
- [x] Competitor analysis
- [x] Initial wireframe designs

### Phase 2: Core Development (Q2)
- [ ] Set up database schemas & seed mock data
- [ ] Implement key interface components

### Phase 3: Launch & Review (Q3)
- [ ] User testing & bug fixing
- [ ] Production deployment

## 🎯 Milestones
- **Milestone 1**: Mockup designs approved
- **Milestone 2**: Core feature complete
- **Milestone 3**: Launch date`
  },
  {
    id: "study-notes",
    name: "Cornell Study Notes",
    icon: "fa-graduation-cap",
    color: "#2563eb",
    description: "Take structured lecture notes with key question cues, summary reflection, and detail lists.",
    title: "Study Notes: {{topic}}",
    subheading: "Cornell formatting layout for learning and review",
    tags: ["study", "education"],
    content: `## 💡 Key Questions & Cues
*Write keywords, questions, or prompt cues here after taking notes.*
- Question 1?
- Cue 2

## 📝 Lecture Notes
*Take detailed notes here during the lecture. Use bullet points and abbreviations.*
- Key Topic A
  - Detail 1
  - Detail 2
- Key Topic B
  - Detail 1

## 🎯 Summary
*Write a 3-4 sentence summary of this page of notes to synthesize your learning.*`
  },
  {
    id: "recipe-planner",
    name: "Recipe & Meal Prep",
    icon: "fa-utensils",
    color: "#f43f5e",
    description: "Plan preparation times, ingredients checklist, and step-by-step cooking instructions.",
    title: "Recipe: {{meal}}",
    subheading: "Preparation, ingredients list, and steps",
    tags: ["recipe", "food"],
    content: `## ⏱️ Cook Details
- **Prep Time**: 15 mins
- **Cook Time**: 30 mins
- **Servings**: 4 people

## 🛒 Ingredients Checklist
- [ ] Ingredient 1 (Quantity)
- [ ] Ingredient 2 (Quantity)
- [ ] Ingredient 3 (Quantity)

## 🍳 Step-by-Step Instructions
### Step 1
Describe the first step here.

### Step 2
Describe the second step here.

## 💡 Tips & Notes
- Substitutions if needed.
- Storage suggestions.`
  },
  {
    id: "monthly-budget",
    name: "Monthly Budget",
    icon: "fa-wallet",
    color: "#10b981",
    description: "Manage your financial health with fixed income, fixed expenses, variables, and savings goals.",
    title: "Monthly Budget - {{month}}",
    subheading: "Monthly financial health and trackers",
    tags: ["finance", "budget"],
    content: `## 💵 Fixed Income Sources
- **Salary**: $4,000 / month
- **Side Work**: $500 / month

## 🏠 Fixed Monthly Expenses
- Rent/Mortgage: $1,200
- Insurance: $150
- Utilities: $200

## 🛒 Variable Expenses Tracker
- [ ] Groceries (Budget: $400)
- [ ] Dining Out (Budget: $200)
- [ ] Entertainment (Budget: $150)

## 🐷 Savings Goals
- Emergency Fund Contribution: $300
- Investment Accounts: $500`
  },
  {
    id: "book-review",
    name: "Book Review & Log",
    icon: "fa-book",
    color: "#b45309",
    description: "Track book details, ratings, key summaries, core lessons, and favorite quotes.",
    title: "Book Review: {{book}}",
    subheading: "Thoughts, key lessons, and summary reflections",
    tags: ["reading", "books"],
    content: `## 📖 Book Information
- **Title**: {{book}}
- **Author**: [Author Name]
- **Genre**: [Genre]
- **Rating**: ⭐⭐⭐⭐⭐ (5/5)

## 🎯 One-Sentence Summary
Write a quick, high-level summary of the book's core premise here.

## 💡 Core Takeaways & Lessons
- Takeaway 1
- Takeaway 2
- Takeaway 3

## 💬 Favorite Quotes
> "Write a quote that resonated with you here." — Page X

## 📝 Review & Thoughts
Write your detailed review and personal thoughts about the book here.`
  },
  {
    id: "travel-itinerary",
    name: "Travel Itinerary",
    icon: "fa-plane",
    color: "#0891b2",
    description: "Organize flights, lodging, packing lists, and day-by-day travel schedules.",
    title: "Trip to: {{destination}}",
    subheading: "Travel itinerary, bookings, and packing checks",
    tags: ["travel", "itinerary"],
    content: `## ✈️ Bookings & Details
- **Departing Flight**: [Flight #] | [Date/Time]
- **Return Flight**: [Flight #] | [Date/Time]
- **Lodging**: [Hotel / AirBnB Name] | [Address]

## 🧳 Packing Checklist
- [ ] Passport / ID & Documents
- [ ] Chargers & Tech
- [ ] Clothes & toiletries
- [ ] First-aid & meds

## 🗺️ Day-by-Day Schedule
### Day 1: Arrival & Exploration
- [ ] Check-in to lodging
- [ ] Dinner at [Restaurant Name]

### Day 2: Main Activities
- [ ] Morning sightseeing at [Location]
- [ ] Afternoon tour / activity

### Day 3: Departure
- [ ] Souvenir shopping
- [ ] Head to airport / station`
  },
  {
    id: "workout-log",
    name: "Workout Log",
    icon: "fa-dumbbell",
    color: "#ef4444",
    description: "Plan workout routines, track weight/reps checklists, and monitor hydration/nutrition goals.",
    title: "Workout Session - {{date}}",
    subheading: "Exercises, reps/sets tracking, and fitness details",
    tags: ["fitness", "workout"],
    content: `## 🎯 Focus Area
Focus: **Push Day / Pull Day / Legs / Cardio**

## 🏋️ Routine & Tracking
### Exercise 1: Bench Press / Squats
- **Set 1**: [ ] 10 reps @ [Weight]
- **Set 2**: [ ] 10 reps @ [Weight]
- **Set 3**: [ ] 8 reps @ [Weight]

### Exercise 2: Shoulder Press / Pull-ups
- **Set 1**: [ ] 12 reps
- **Set 2**: [ ] 10 reps
- **Set 3**: [ ] 10 reps

### Exercise 3: Accessory / Isolation
- **Set 1**: [ ] 12 reps
- **Set 2**: [ ] 12 reps

## 🥗 Nutrition & Hydration
- **Water Intake Goal**: 3 Liters (Track: [ ] 1L | [ ] 2L | [ ] 3L)
- **Pre-workout Meal**: [Meal Detail]
- **Post-workout Protein**: [Protein Detail]`
  },
  {
    id: "professional-resume",
    name: "Professional Resume",
    icon: "fa-file-invoice",
    color: "#4f46e5",
    description: "Create a clean, structured professional resume with details of experience, education, and skills.",
    title: "Resume - {{name}}",
    subheading: "Professional resume and career profile",
    tags: ["resume", "career"],
    content: `# [Your Name]
**[Desired Job Title / Profession]**
📧 [email@example.com] | 📱 [Phone Number] | 🌐 [LinkedIn / Portfolio Link]

---

## 👤 Professional Summary
A highly motivated and results-oriented professional with experience in [industry/field]. Proven track record of [key achievement or skill]. Adept at collaborating with cross-functional teams to deliver high-quality projects.

## 💼 Professional Experience

### **[Job Title]** | [Company Name], [Location]
*Month Year – Present*
- Led the development and implementation of [project or system], resulting in a [X%] increase in efficiency.
- Managed a team of [number] members, overseeing daily tasks and project deliverables.
- Collaborated with design and product teams to refine [product feature].

### **[Previous Job Title]** | [Previous Company], [Location]
*Month Year – Month Year*
- Developed and maintained [system/software/process], decreasing bugs by [X%].
- Analyzed database logs and improved query performance.

## 🎓 Education

### **Bachelor of Science in [Major]** | [University Name]
*Year – Year*
- **Honors/Activities**: [Details]

## 🛠️ Technical Skills & Tools
- **Languages/Frameworks**: [Skills]
- **Tools/Platforms**: [Tools]
- **Methodologies**: Agile, Scrum, CI/CD`
  }
];

/**
 * Gets a formatted template object with replaced dynamic values.
 */
export const getFormattedTemplate = (template) => {
  if (!template) return null;
  const now = new Date();
  
  // Get ISO Week Number
  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const formattedDate = now.toLocaleDateString("en-US", { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const monthText = now.toLocaleDateString("en-US", { 
    month: 'long', 
    year: 'numeric' 
  });
  const weekNum = getWeekNumber(now);

  const formattedTitle = template.title
    .replace("{{date}}", formattedDate)
    .replace("{{topic}}", "[Topic]")
    .replace("{{week}}", weekNum)
    .replace("{{meal}}", "[Meal Name]")
    .replace("{{month}}", monthText)
    .replace("{{book}}", "[Book Title]")
    .replace("{{destination}}", "[Destination Name]")
    .replace("{{name}}", "[Your Name]")
    .replace("{{project}}", "[Project Name]");

  return {
    ...template,
    title: formattedTitle
  };
};
