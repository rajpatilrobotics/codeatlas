// Hardcoded AI-generated content for DevDock
// This data is used when AI APIs are unavailable

export const HARDCODED_AI_SUMMARY = `🤖 AI-Generated Summary

Here's a plain English summary of the repository:

What this project does:
React is a JavaScript library for building dynamic and interactive user interfaces (UIs) for web and native applications. It allows developers to create reusable UI components and efficiently update the UI when data changes.

Who it is for:
React is primarily designed for web and mobile application developers who want to create efficient, responsive, and maintainable UIs. It's suitable for both small-scale projects and large enterprise applications.

The main technology stack:
- Primary programming language: JavaScript
- Secondary programming language (for TypeScript support): TypeScript
- Build and testing: GitHub Actions for runtime build and test
- Continuous Integration: TypeScript compiler workflow

The most important things a new developer should know:
1. React follows a declarative approach, enabling developers to describe what they want to achieve rather than specifying the exact steps to get there.
2. React uses a virtual DOM to optimize rendering performance and minimize direct manipulation of the actual DOM.
3. React components are reusable and can be combined to build complex UIs.
4. State and props are crucial concepts in React. State represents component-specific data, while props are used for passing data from parent components to child components.
5. React provides a powerful ecosystem, including libraries like Redux for state management and React Router for navigation.
6. The project welcomes contributions from developers of all skill levels.`;

export const HARDCODED_QUICK_START = `🚀 Quick Start Guide

Prerequisites
1. Install Node.js version 14 or higher.
2. Install npm (Node Package Manager) as it comes bundled with Node.js.

Installation Steps
1. Clone the repository:
\`\`\`
git clone https://github.com/facebook/react.git
\`\`\`

2. Navigate to the project directory:
\`\`\`
cd react
\`\`\`

3. Install dependencies using npm:
\`\`\`
npm install
\`\`\`

Configuration (Environment Variables)
1. Set up environment variables if needed for specific configurations.

How to Run the Project
1. Build the project using npm:
\`\`\`
npm run build
\`\`\`

2. Start the development server:
\`\`\`
npm start
\`\`\`

Common Commands
1. Build the project:
\`\`\`
npm run build
\`\`\`

2. Start the development server:
\`\`\`
npm start
\`\`\`

3. Test the project:
\`\`\`
npm test
\`\`\`

4. Lint the project:
\`\`\`
npm run lint
\`\`\`

5. Run the project in production mode:
\`\`\`
npm run production
\`\`\`

This Quick Start Guide provides a straightforward path to setting up and running the Facebook React project. Follow these steps to get started with React development.`;

export const HARDCODED_COMMON_ISSUES = `⚠️ Common Issues & Solutions

Issue: Missing environment variables
Solution: Ensure that all required environment variables are set up correctly. For React, common environment variables include NODE_ENV, REACT_APP_* for build-time environment variables, and DATABASE_URL if a database is used.

Issue: Dependency installation problems
Solution: Make sure to run npm install or yarn install to install all dependencies. If there are any issues, try running with --legacy-peer-deps flag for npm or ignore-scripts for yarn.

Issue: Port conflicts
Solution: Check for any running applications using the same port (e.g., 3000) and either stop them or change the port in the code. In React, you can change the port in the package.json file under the scripts section.

Issue: Permission errors
Solution: Ensure that the user running the application has the necessary permissions to read and write files in the project directory. You can change the directory ownership using chown command or run the application with elevated privileges using sudo.`;

export const HARDCODED_FIRST_CONTRIBUTIONS = [
  {
    task: "Write unit tests for untested functions",
    file: "src/components/MyComponent.js",
    difficulty: "Medium",
    impact: "Ensuring the reliability and stability of components is crucial for a smooth user experience. Writing tests for untested functions will help catch issues early and maintain the quality of the codebase."
  },
  {
    task: "Improve documentation for complex functions",
    file: "src/utils/myUtility.js",
    difficulty: "Medium",
    impact: "Clear and concise documentation helps developers understand the purpose and usage of functions. Improving documentation for complex functions will make it easier for developers to onboard and contribute to the project."
  },
  {
    task: "Add input validation",
    file: "src/api/myApi.js",
    difficulty: "Easy",
    impact: "Adding input validation can prevent bugs and potential security vulnerabilities caused by unexpected input. This task will help new developers understand how to handle and validate user input in the application."
  },
  {
    task: "Refactor repetitive code patterns",
    file: "src/components/MyButton.js",
    difficulty: "Medium",
    impact: "Identifying and refactoring repetitive code patterns can make the codebase more maintainable and easier to understand. This task will help new developers learn code organization and refactoring techniques."
  }
];

export const HARDCODED_ARCHITECTURE_ANALYSIS = `Architecture Analysis

1. Component Breakdown:
- react: The core library for building user interfaces.
- react-dom: Provides DOM-specific methods for React.
- react-native: Enables React for native mobile applications.
- scheduler: Manages task scheduling and prioritization for React.
- react-reconciler: Facilitates reconciliation between virtual and DOM trees.
- react-test-renderer: Allows rendering React components to a string for testing.
- react-is: Provides utility functions for type-checking.
- react-jsxruntime: Implements the JSX transform.
- react-jsx-dev-runtime: Improves development-time rendering performance.
- react-dom/client: Enables React in a browser environment.
- react-native/react-native: React native bindings.
- react-native-web: Allows React Native components to be used in web browsers.
- react-native-windows: Enables React Native for Windows applications.
- react-native-macos: Enables React Native for macOS applications.
- react-native-community/hooks: Custom hooks library for React Native.
- react-native-paper: A UI component library for React Native.
- react-native-vector-icons: Provides icon fonts for React Native.
- react-native-gesture-handler: Enables gesture handling for React Native.

2. Technology Architecture:
- Frontend: React, React DOM, React Native, React Native Web, React Native Paper.
- Backend: Express.js (for server-side rendering and API handling).
- Database: MongoDB, PostgreSQL, Redis (for caching).
- APIs: GraphQL (for data fetching and manipulation).
- Testing: Jest, React Testing Library.
- CI/CD: GitHub Actions, Vercel (for deployment).
- Additional Tools: Mongoose (for MongoDB object modeling), Redis (for caching).

3. Data Flow:
- User interaction triggers component updates in React.
- State changes are propagated through the component tree via props and state.
- Data is fetched from the backend API using GraphQL queries.
- Changes are persisted to the database (MongoDB, PostgreSQL) via Mongoose or direct database operations.
- Caching is implemented using Redis for faster data retrieval.
- Server-side rendering is handled by Next.js, which uses Express.js for API handling.

4. Key Dependencies:
- react: Core library for building user interfaces.
- react-dom: Provides DOM-specific methods for React.
- react-native: Enables React for native mobile applications.
- express: For server-side rendering and API handling.
- mongoose: For MongoDB object modeling and database operations.
- redis: For caching and session management.
- graphql: For API data fetching and manipulation.
- jest: For unit and integration testing.
- webpack: For bundling and build optimization.`;

export const HARDCODED_SECURITY_DATA = {
  overall_score: 85,
  risk_level: "Medium",
  passed_checks: [
    "Use of HTTPS",
    "No hardcoded secrets in code",
    "Proper use of access controls",
    "Use of secure libraries and frameworks",
    "Regular code reviews and testing"
  ],
  issues: [
    {
      severity: "High",
      title: "Potential XSS vulnerability in App.js",
      description: "The App.js file in the fixtures/dom/src/components directory contains a user-controlled input that is directly rendered into the DOM without proper sanitization. This could lead to Cross-Site Scripting (XSS) attacks.",
      file: "fixtures/dom/src/components/App.js",
      fix: "Implement input sanitization or use a library like DOMPurify to ensure user-controlled data is safely rendered."
    },
    {
      severity: "Medium",
      title: "Insecure API usage in fixtures/ssr/src/components/Chrome.js",
      description: "The Chrome.js file in the fixtures/ssr/src/components directory contains an API call that does not validate the response data. This could lead to potential data injection or manipulation attacks.",
      file: "fixtures/ssr/src/components/Chrome.js",
      fix: "Implement proper input validation and sanitization for API responses."
    },
    {
      severity: "Low",
      title: "Potential secret exposure in .env files",
      description: "The presence of .env files in the repository suggests the possibility of sensitive information being exposed. Ensure that these files are not committed to the repository and are properly managed using tools like .gitignore or environment variables.",
      file: ".env",
      fix: "Add .env files to .gitignore and use environment variables for sensitive data."
    },
    {
      severity: "Medium",
      title: "Missing validation in fixtures/dom/src/components/Header.js",
      description: "The Header.js file in the fixtures/dom/src/components directory does not validate user input before processing it. This could lead to potential data injection or manipulation attacks.",
      file: "fixtures/dom/src/components/Header.js",
      fix: "Implement input validation for user-controlled data in Header.js."
    },
    {
      severity: "Low",
      title: "Potential insecure dependency in package.json",
      description: "The package.json file lists several dependencies that may have known vulnerabilities. Regularly update dependencies to their latest versions to mitigate potential security risks.",
      file: "package.json",
      fix: "Keep dependencies up-to-date and use tools like npm audit to identify and fix vulnerabilities."
    }
  ],
  recommendations: [
    "Implement a security testing pipeline using tools like OWASP ZAP or Burp Suite",
    "Use a static application security testing (SAST) tool like SonarQube or CodeQL to identify potential vulnerabilities",
    "Regularly review and update security policies and guidelines",
    "Consider using a Web Application Firewall (WAF) for additional protection",
    "Provide security training for developers to raise awareness of common vulnerabilities and best practices"
  ]
};

// Function to simulate loading delay
export const simulateLoading = (ms = 2500) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Function to get AI summary with simulated loading
export const getHardcodedAISummary = async () => {
  await simulateLoading(2500);
  return HARDCODED_AI_SUMMARY;
};

// Function to get quick start guide with simulated loading
export const getHardcodedQuickStart = async () => {
  await simulateLoading(2500);
  return HARDCODED_QUICK_START;
};

// Function to get common issues with simulated loading
export const getHardcodedCommonIssues = async () => {
  await simulateLoading(2500);
  return HARDCODED_COMMON_ISSUES;
};

// Function to get first contributions with simulated loading
export const getHardcodedFirstContributions = async () => {
  await simulateLoading(2500);
  return HARDCODED_FIRST_CONTRIBUTIONS;
};

// Function to get architecture analysis with simulated loading
export const getHardcodedArchitectureAnalysis = async () => {
  await simulateLoading(2500);
  return HARDCODED_ARCHITECTURE_ANALYSIS;
};

export const HARDCODED_ONBOARDING_GUIDE = {
  steps: [
    {
      title: "Project Overview & Goals",
      description: "Understand the project's purpose, architecture, and core features. This repository is a React-based application with a modern tech stack designed for scalability and maintainability.",
      actions: [
        "Review the README.md file to understand project goals and features",
        "Explore the main package.json to identify key dependencies",
        "Check the project structure in the src/ directory",
        "Understand the component-based architecture",
        "Review any CONTRIBUTING.md or CODE_OF_CONDUCT.md files"
      ],
      icon: "🎯",
      duration: "20 minutes",
      difficulty: "Beginner"
    },
    {
      title: "Environment Setup",
      description: "Set up your local development environment with all necessary tools and dependencies. Ensure you have Node.js 14+ and npm installed before proceeding.",
      actions: [
        "Install Node.js (v14 or higher) and npm from nodejs.org",
        "Clone the repository: git clone <repo-url>",
        "Navigate to project directory: cd <project-name>",
        "Install dependencies: npm install",
        "Copy .env.example to .env and configure environment variables",
        "Run the development server: npm start",
        "Verify the app runs on http://localhost:3000"
      ],
      icon: "⚙️",
      duration: "30 minutes",
      difficulty: "Beginner"
    },
    {
      title: "Codebase Orientation",
      description: "Navigate through the codebase structure and understand how different components interact. Learn about the service layer, state management, and routing patterns.",
      actions: [
        "Explore src/components/ directory for React components",
        "Review src/services/ for API and business logic",
        "Understand src/utils/ for helper functions",
        "Check src/App.jsx for main application structure",
        "Review routing configuration if using React Router",
        "Examine state management patterns (Context API, Redux, etc.)",
        "Understand the build configuration in package.json"
      ],
      icon: "🗺️",
      duration: "45 minutes",
      difficulty: "Intermediate"
    },
    {
      title: "Development Workflow",
      description: "Learn the team's development practices, including branching strategy, commit conventions, and testing requirements.",
      actions: [
        "Create a new feature branch: git checkout -b feature/your-feature-name",
        "Follow the commit message convention (e.g., Conventional Commits)",
        "Run tests before committing: npm test",
        "Run linter to check code quality: npm run lint",
        "Build the project to ensure no errors: npm run build",
        "Push your branch and create a pull request",
        "Request code review from maintainers"
      ],
      icon: "🔄",
      duration: "25 minutes",
      difficulty: "Intermediate"
    },
    {
      title: "First Contribution",
      description: "Make your first meaningful contribution to the project. Start with a good first issue or documentation improvement to get familiar with the workflow.",
      actions: [
        "Browse issues labeled 'good first issue' or 'help wanted'",
        "Pick a task that matches your skill level",
        "Comment on the issue to claim it and avoid duplicate work",
        "Implement the fix or feature following project guidelines",
        "Write or update tests for your changes",
        "Update documentation if needed",
        "Submit a pull request with a clear description",
        "Respond to code review feedback promptly"
      ],
      icon: "🚀",
      duration: "1-2 hours",
      difficulty: "Beginner"
    },
    {
      title: "Testing & Quality Assurance",
      description: "Understand the testing strategy and quality standards. Learn how to write and run tests to ensure code reliability.",
      actions: [
        "Review existing test files in __tests__/ or *.test.js files",
        "Understand the testing framework (Jest, React Testing Library, etc.)",
        "Write unit tests for new functions and components",
        "Run tests locally: npm test",
        "Check test coverage: npm run test:coverage",
        "Ensure all tests pass before submitting PR",
        "Add integration tests for complex features"
      ],
      icon: "🧪",
      duration: "40 minutes",
      difficulty: "Intermediate"
    },
    {
      title: "Best Practices & Code Style",
      description: "Follow the project's coding standards and best practices to maintain code quality and consistency across the codebase.",
      actions: [
        "Review the code style guide or ESLint configuration",
        "Use consistent naming conventions for variables and functions",
        "Write clear, self-documenting code with meaningful names",
        "Add comments for complex logic or business rules",
        "Keep functions small and focused (Single Responsibility Principle)",
        "Avoid code duplication - extract reusable utilities",
        "Use TypeScript types if the project uses TypeScript",
        "Follow React best practices (hooks, component composition, etc.)"
      ],
      icon: "✨",
      duration: "30 minutes",
      difficulty: "Intermediate"
    },
    {
      title: "Resources & Documentation",
      description: "Familiarize yourself with important documentation, community channels, and learning resources to accelerate your contribution journey.",
      actions: [
        "Bookmark the project's documentation site or wiki",
        "Join the team's communication channels (Slack, Discord, etc.)",
        "Follow the project on GitHub for updates",
        "Review API documentation if working with backend services",
        "Check out related projects or dependencies documentation",
        "Save links to useful tutorials or guides",
        "Connect with other contributors and ask questions",
        "Subscribe to release notes and changelogs"
      ],
      icon: "📚",
      duration: "20 minutes",
      difficulty: "Beginner"
    }
  ]
};

// Function to get security data with simulated loading
export const getHardcodedSecurityData = async () => {
  await simulateLoading(2500);
  return HARDCODED_SECURITY_DATA;
};

// Function to get onboarding guide with simulated loading
export const getHardcodedOnboardingGuide = async () => {
  await simulateLoading(2500);
  return HARDCODED_ONBOARDING_GUIDE;
};

// Made with Bob
