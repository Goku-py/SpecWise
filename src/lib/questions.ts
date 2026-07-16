export interface QuestionOption {
  value: string
  label: string
  description?: string
}

export interface QuizQuestion {
  id: string
  key: string
  question: string
  description?: string
  type: "single" | "multiple" | "number" | "boolean"
  options?: QuestionOption[]
  placeholder?: string
  required: boolean
  mode: "simple" | "advanced" | "both"
  max?: number
  followUp?: {
    dependsOn: string
    values: string[]
  }
  condition?: {
    dependsOn: string
    values: string[]
  }
}

export const simpleQuestions: QuizQuestion[] = [
  {
    id: "useCase",
    key: "useCase",
    question: "What will you mainly use the laptop for?",
    description: "This helps us prioritize the right specs for your workload.",
    type: "single",
    required: true,
    mode: "both",
    options: [
      { value: "student", label: "Study & College", description: "Classes, assignments, browsing, light productivity" },
      { value: "office", label: "Office & Home", description: "Documents, spreadsheets, meetings, streaming" },
      { value: "coding", label: "Coding & Development", description: "Programming, VMs, Docker, databases" },
      { value: "gaming", label: "Gaming", description: "Casual, esports, or AAA gaming" },
      { value: "video-editing", label: "Video Editing", description: "Timeline editing, rendering, color grading" },
      { value: "graphic-design", label: "Graphic Design", description: "Adobe Creative Suite, 3D, illustration" },
      { value: "travel", label: "Business Travel", description: "Lightweight, long battery, portable" },
      { value: "general", label: "General Home Use", description: "Web browsing, email, streaming, light tasks" },
      { value: "ai-ml", label: "AI & ML Experimentation", description: "Running local models, training, data science" },
      { value: "mixed", label: "Mixed Use", description: "A bit of everything" },
    ],
  },
  {
    id: "budget",
    key: "budget",
    question: "What's your budget range?",
    description: "We'll use this to find the best options for you.",
    type: "single",
    required: true,
    mode: "both",
  },
  {
    id: "os",
    key: "os",
    question: "Which operating system do you prefer?",
    type: "single",
    required: false,
    mode: "both",
    options: [
      { value: "windows", label: "Windows", description: "Most software & game compatible" },
      { value: "macos", label: "macOS", description: "Apple ecosystem, great for creative work" },
      { value: "chromeos", label: "ChromeOS", description: "Simple, secure, cloud-first" },
      { value: "linux", label: "Linux", description: "For developers and power users" },
      { value: "no-preference", label: "No preference", description: "Recommend the best regardless" },
    ],
  },
  {
    id: "minRam",
    key: "minRam",
    question: "How much RAM do you need?",
    description: "RAM affects how many apps you can run smoothly at once.",
    type: "single",
    required: false,
    mode: "both",
    options: [
      { value: "8", label: "8 GB", description: "Basic browsing, office work, streaming" },
      { value: "16", label: "16 GB", description: "Smooth multitasking, coding, light editing" },
      { value: "24", label: "24 GB", description: "Heavy workloads, VMs, large datasets" },
      { value: "32", label: "32 GB+", description: "Professional editing, AI/ML, serious development" },
    ],
  },
  {
    id: "gpu",
    key: "gpu",
    question: "Do you need dedicated graphics?",
    description: "Dedicated GPUs are essential for gaming, 3D work, and video editing.",
    type: "single",
    required: false,
    mode: "both",
    options: [
      { value: "integrated", label: "No, integrated is fine", description: "For everyday tasks, browsing, office" },
      { value: "dedicated", label: "Yes, I need dedicated graphics", description: "For gaming, editing, 3D, or AI workloads" },
      { value: "maybe", label: "Not sure, recommend both", description: "Show me options with and without" },
    ],
  },
  {
    id: "battery",
    key: "battery",
    question: "How important is battery life?",
    type: "single",
    required: false,
    mode: "both",
    options: [
      { value: "low", label: "Not important", description: "I'll mostly be plugged in" },
      { value: "medium", label: "Somewhat important", description: "A few hours unplugged is enough" },
      { value: "high", label: "Very important", description: "Need all-day battery for portability" },
      { value: "top", label: "Top priority", description: "Maximum battery life is critical" },
    ],
  },
  {
    id: "displaySize",
    key: "displaySize",
    question: "What screen size do you prefer?",
    type: "single",
    required: false,
    mode: "both",
    options: [
      { value: "13-14", label: "13–14 inches", description: "Portable and lightweight" },
      { value: "15-16", label: "15–16 inches", description: "Balanced screen and size" },
      { value: "17+", label: "17 inches+", description: "Maximum screen real estate" },
      { value: "no-preference", label: "No preference", description: "Recommend the best fit" },
    ],
  },
  {
    id: "portability",
    key: "portability",
    question: "How portable should it be?",
    type: "single",
    required: false,
    mode: "both",
    options: [
      { value: "light", label: "Very light & thin", description: "Carry daily, under 1.5 kg" },
      { value: "balanced", label: "Balanced", description: "Reasonable weight, good performance" },
      { value: "desktop-replacement", label: "Desktop replacement", description: "Performance over portability" },
    ],
  },
]

export const advancedQuestions: QuizQuestion[] = [
  {
    id: "cpuBrand",
    key: "cpuBrand",
    question: "Which processor brand do you prefer?",
    type: "single",
    required: false,
    mode: "advanced",
    options: [
      { value: "intel", label: "Intel Core" },
      { value: "amd", label: "AMD Ryzen" },
      { value: "apple", label: "Apple Silicon" },
      { value: "no-preference", label: "No preference" },
    ],
  },
  {
    id: "minStorage",
    key: "minStorage",
    question: "How much storage do you need?",
    description: "SSD storage affects how fast your laptop feels and how many files you can keep.",
    type: "single",
    required: false,
    mode: "advanced",
    options: [
      { value: "256", label: "256 GB", description: "Basic needs, cloud storage user" },
      { value: "512", label: "512 GB", description: "Good balance for most users" },
      { value: "1024", label: "1 TB", description: "Heavy files, games, media" },
      { value: "2048", label: "2 TB+", description: "Professional media, large game libraries" },
    ],
  },
  {
    id: "displayQuality",
    key: "displayQuality",
    question: "What display quality do you prefer?",
    description: "Select up to 3 preferences that matter most to you.",
    type: "multiple",
    max: 3,
    required: false,
    mode: "advanced",
    options: [
      { value: "basic", label: "Basic Full HD" },
      { value: "bright", label: "High brightness", description: "For outdoor or bright room use" },
      { value: "color-accurate", label: "Color accurate", description: "For design, photo, and video work" },
      { value: "oled", label: "OLED", description: "Best contrast and colors" },
      { value: "high-refresh", label: "High refresh rate", description: "For gaming and smooth scrolling" },
      { value: "touch", label: "Touchscreen", description: "For note-taking and creative work" },
    ],
  },
  {
    id: "gaming",
    key: "gaming",
    question: "Do you care about gaming performance?",
    type: "single",
    required: false,
    mode: "advanced",
    options: [
      { value: "none", label: "No gaming" },
      { value: "casual", label: "Casual gaming", description: "Indie games, older titles" },
      { value: "esports", label: "Esports gaming", description: "Valorant, CS2, League, Overwatch" },
      { value: "aaa", label: "AAA gaming", description: "Cyberpunk, Call of Duty, Elden Ring" },
    ],
  },
  {
    id: "upgradeability",
    key: "upgradeability",
    question: "Do you need upgradeable RAM or storage?",
    type: "single",
    required: false,
    mode: "advanced",
    options: [
      { value: "must-have", label: "Must have" },
      { value: "nice-to-have", label: "Nice to have" },
      { value: "not-important", label: "Not important" },
    ],
  },
  {
    id: "buildQuality",
    key: "buildQuality",
    question: "How important are build quality and durability?",
    type: "single",
    required: false,
    mode: "advanced",
    options: [
      { value: "not-important", label: "Not important" },
      { value: "nice-to-have", label: "Nice to have" },
      { value: "very-important", label: "Very important", description: "Premium materials, metal build" },
    ],
  },
  {
    id: "refurbished",
    key: "refurbished",
    question: "Are you open to refurbished laptops?",
    description: "Refurbished laptops can offer great value and lower e-waste.",
    type: "boolean",
    required: false,
    mode: "advanced",
    options: [
      { value: "true", label: "Yes, show me refurbished options" },
      { value: "false", label: "No, new only" },
    ],
  },
  {
    id: "webcam",
    key: "webcam",
    question: "What webcam quality do you need?",
    type: "single",
    required: false,
    mode: "advanced",
    options: [
      { value: "not-important", label: "Basic is fine" },
      { value: "nice-to-have", label: "Good quality", description: "720p+ with decent light handling" },
      { value: "very-important", label: "Excellent", description: "1080p+ for professional video calls" },
    ],
  },
  {
    id: "ports",
    key: "ports",
    question: "What ports do you need?",
    type: "multiple",
    required: false,
    mode: "advanced",
    options: [
      { value: "hdmi", label: "HDMI" },
      { value: "usb-a", label: "USB-A" },
      { value: "usb-c", label: "USB-C" },
      { value: "thunderbolt", label: "Thunderbolt" },
      { value: "sd-card", label: "SD Card Reader" },
      { value: "ethernet", label: "Ethernet" },
      { value: "headphone", label: "Headphone Jack" },
    ],
  },
  {
    id: "security",
    key: "security",
    question: "What security features do you need?",
    type: "multiple",
    required: false,
    mode: "advanced",
    options: [
      { value: "fingerprint", label: "Fingerprint Reader" },
      { value: "face", label: "Face Unlock" },
      { value: "tpm", label: "TPM / Business Security" },
    ],
  },
]

export const USE_CASE_LABELS: Record<string, string> = {
  student: "Study & College",
  office: "Office & Home",
  coding: "Coding & Development",
  gaming: "Gaming",
  "video-editing": "Video Editing",
  "graphic-design": "Graphic Design",
  travel: "Business Travel",
  general: "General Home Use",
  "ai-ml": "AI & ML",
  mixed: "Mixed Use",
}

