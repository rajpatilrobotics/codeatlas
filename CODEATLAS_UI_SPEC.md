# CodeAtlas UI Specification

This document contains the complete UI specification for CodeAtlas (DevDock V2).

**Source**: Master prompt from ChatGPT  
**Purpose**: Transform DevDock into CodeAtlas with premium matte-black UI  
**Design Inspiration**: Vercel, Linear, Cursor, Render, GitHub

---

## Product Identity

**Name**: CodeAtlas  
**Tagline**: Understand Systems. Predict Impact.

**Description**: AI-powered repository intelligence platform for developers

**Core Value**: Help developers understand repositories, visualize architecture, perform blast radius analysis, debug systems, and onboard faster into unfamiliar codebases.

---

## Design Philosophy

### Visual Feel
- Premium, calm, intelligent, engineering-grade
- Matte black surfaces
- Infrastructure-tool quality
- Dense but breathable
- Minimal but powerful
- Technical but clean
- NOT flashy

### Inspiration Sources
- Vercel (dashboard aesthetic)
- Render (infrastructure calmness)
- Linear (engineering workflows)
- Cursor (AI-native development)
- GitHub (technical clarity)

---

## Global Color System

### Background Colors
```css
Primary Background: #0A0A0A
Panel Surface 1: #111111
Panel Surface 2: #141414
```

### Borders
- Extremely subtle graphite separators only
- Minimal opacity
- Almost invisible

### Typography Colors
- Soft white (primary text)
- Muted gray (secondary text)
- Subtle hierarchy

### Accent Color
- Minimal icy cyan accents
- ONLY where necessary
- Sparingly used

### Risk Color System
```
Cool gray-blue → Safe
Amber/yellow → Medium risk
Orange → High risk
Red → Critical
Subtle pulsing red glow → Active threat only
```

**Important**: Risk colors appear ONLY contextually. UI remains primarily monochrome matte black.

---

## Typography System

### Rules
- ONE font family globally
- ONE heading hierarchy
- ONE body text hierarchy
- ONE muted text hierarchy
- Consistent across ALL screens

### Inspiration
- Vercel typography
- Linear typography
- GitHub typography

### Forbidden
- Random font size increases
- Giant headings
- Inconsistent styles
- Different typography between screens

---

## Panel Style

### Characteristics
- Matte black surfaces
- Almost flat
- Tiny layered depth
- NO heavy shadows
- NO glassmorphism
- NO glow effects
- Soft rounded corners
- Subtle hover brightness only

### Inspiration
- Vercel dashboard panels
- Render dashboard panels
- Linear desktop app panels

---

## Animation Style

### Allowed
- Ultra subtle
- Smooth
- Calm
- Fast
- Soft fades
- Tiny hover elevation
- Subtle transitions

### Forbidden
- Bouncy animations
- Flashy motion
- Dramatic page transitions
- Excessive animation

---

## React Flow Integration

### CRITICAL RULE
Backend uses React Flow to dynamically generate:
- Architecture diagrams
- Dependency graphs
- Blast radius maps
- Debug traces
- Heatmaps
- Folder structures
- Node graphs

### Implementation
- Generate ONLY empty graph container areas
- NO fake graphs
- NO fake nodes
- NO fake dependency diagrams
- NO placeholder architecture systems
- NO hardcoded graph structures

### Graph Container Style
- Blank
- Spacious
- Minimal
- Ready for future React Flow rendering

---

## Global App Layout

### Left Sidebar Structure

**OVERVIEW**
- Dashboard
- Summary
- Architecture
- Onboarding Guide
- Documentation

**INTELLIGENCE**
- Repository Graph
- Blast Radius
- Planner
- Debug Navigator
- Heatmap

**SECURITY**
- Security Scanner

**AI WORKSPACE**
- Chat

**WORKSPACES**
- Saved Workspaces

### Sidebar Rules
- Globally identical across ALL screens
- Same spacing everywhere
- Same typography everywhere
- Same width everywhere
- Same icon sizes everywhere
- Collapsible
- Support compact icon-only mode
- Monochrome icons
- Subtle separators
- Thin active indicators

### Forbidden in Sidebar
- Colorful icons
- Giant navigation pills
- Glowing effects
- Gradients

---

## Topbar Structure

### Contains ONLY
- CodeAtlas branding
- Tagline
- Search / Cmd + K
- Current Repo dropdown
- Built by Raj Patil [LinkedIn]

### Forbidden in Topbar
- Profile avatar
- User photo
- Notification bell
- Docs button
- Deploy button
- Support button
- Random menus
- Account dropdowns
- Extra navigation tabs

### Style
- Compact
- Minimal
- Engineering-focused

---

## Main Workspace

### Center Area
- Changes based on selected page
- Primary content area

### Right Intelligence Panel
- Compact
- Minimal
- Informative

### May Include
- Node Summary
- Risk Score
- Dependencies
- Related Files
- AI Insights
- Suggested Fixes

---

## Screen Specifications

### Landing Page
**Includes**:
- CodeAtlas branding
- Tagline
- Repository URL input
- Analyze Repository button
- Feature checklist:
  - ✓ Architecture Intelligence
  - ✓ Dependency Mapping
  - ✓ Blast Radius Analysis
  - ✓ Security Scanning
  - ✓ AI Engineering Copilot
- Built by Raj Patil [LinkedIn]

**Forbidden**:
- Giant hero graphics
- Marketing sections
- Fake testimonials
- Random feature cards
- Gradients
- Fake charts

---

### Loading / Analysis Flow
**Includes**:
- Loading progress
- Subtle evolving empty graph container
- Checklist progress:
  - ✓ Cloning repository
  - ✓ Parsing file structure
  - ✓ Detecting architecture
  - ○ Building dependency graph
  - ○ Running security analysis
  - ○ Generating AI insights
  - ○ Preparing onboarding workspace

**Forbidden**:
- Hacker terminal spam
- Neon effects
- Fake hacking visuals

---

### Dashboard Screen
**Purpose**: Repository mission control & intelligence launcher

**Includes**:
- Repository overview
- KPI cards
- Recent Intelligence
- Quick Navigation
- AI Recommendations

**Forbidden**:
- Duplicate architecture page
- Duplicate onboarding page
- Duplicate documentation page

---

### Summary Screen
**Includes**:
- Repository Overview
- AI Generated Summary
- Tech Stack
- Quick Start Guide
- Common Issues
- First Contribution
- README Preview
- Important Files

**Note**: NO architecture diagrams here

---

### Architecture Screen
**Includes**:
- Interactive System Architecture (empty container)
- Dynamic Data Flow Diagram (empty container)
- Function Call Flow (empty container)
- Interactive Folder Structure (empty container)

**Important**: All graph sections remain EMPTY containers

**Each section includes**: [Download] button at bottom-right

---

### Onboarding Guide
**Includes**:
- Code Insights
- Frameworks
- Key Functions
- Architecture Patterns
- Codebase Statistics
- Key Components
- Empty graph containers for:
  - Interactive Architecture
  - Dynamic Data Flow
  - Function Call Flow
  - Folder Structure

---

### Documentation Screen
**Includes**:
- README & Setup
- Environment Variables
- Key Functions
- Tech Stack
- Codebase Insights
- AI Explanations

**Style**: AI-powered engineering wiki

---

### Repository Graph Screen
**Includes**:
- One massive EMPTY graph container
- Bottom intelligence panel

**Forbidden**:
- Fake dependency graph
- Fake nodes
- Fake edges

---

### Blast Radius Screen
**Includes**:
- One large EMPTY graph container
- Impact analysis side panel

**Forbidden**: Fake heatmaps or fake nodes

---

### Planner Screen
**Includes**:
- Task title
- Affected systems
- Suggested file changes
- Risk level

**Style**: Compact engineering planner

---

### Debug Navigator Screen
**Includes**:
- EMPTY graph container
- AI Root Cause Analysis
- Suggested Fixes

**Forbidden**: Fake debug graphs

---

### Heatmap Screen
**Includes**:
- EMPTY graph container
- Critical Dependency Clusters
- Instability Regions
- High Change Frequency

**Forbidden**: Fake heatmaps

---

### Security Scanner
**Includes**:
- Security Score
- Risk Level
- Passed Checks
- Vulnerabilities Found
- Security Recommendations
- AI Security Insights

**Style**: Premium engineering security workspace (NOT hacker UI)

---

### Chat / AI Workspace

**Inspiration**: ChatGPT, Claude, Cursor (NOT generic chatbot UI)

**Initial State**:
- Centered empty chat area
- Quick actions visible
- Suggested questions visible

**After First Message**:
- Conversation becomes primary focus
- Quick actions move below conversation
- Suggested questions move below conversation

**Quick Actions**:
- Explain
- Debug
- Improve
- Setup
- Find
- Security
- Architecture
- General

**Suggested Questions**:
- What does this project do?
- How do I set up this project?
- What are the main components?
- Where is authentication handled?
- What are the key dependencies?

---

## Command Palette (Cmd + K)

**Includes**:
- Open Repository Graph
- Open Security Scanner
- Open Documentation
- Open Planner
- Search files
- Show risky modules
- Explain architecture

**Inspiration**: Raycast, Cursor, Linear

---

## Saved Workspaces

**Display**: Compact premium cards

**Each Card Includes**:
- Repository name
- Tech stack
- Risk score
- Last analyzed timestamp

---

## Component Rules

### Download Button
**Placement**: Bottom-right corner of every graph/diagram workspace

**Style**:
- Minimal
- Monochrome
- Subtle
- Small
- Infra-tool style

### Empty States
**Style**:
- Minimal
- Calm
- Premium

**Forbidden**:
- Mascots
- Giant illustrations
- Playful onboarding graphics

### Error States
**Style**:
- Resilient
- Intelligent
- Trustworthy
- One reusable premium error component

**Forbidden**:
- Giant error pages
- Scary warning screens
- Flashy red UIs

---

## Final Product Feel

CodeAtlas should feel like:
- Vercel for repository intelligence
- Linear for engineering workflows
- Cursor for AI-native development
- Render for infrastructure calmness

### Characteristics
- Premium
- Intelligent
- Calm
- Engineering-grade
- Modern
- Trustworthy
- Technical
- Polished

### NOT
- Flashy
- Gimmicky
- Cyberpunk
- Neon
- AI-generated looking

---

## Critical Rules Summary

### DO
✅ Maintain perfect visual consistency
✅ Use matte black surfaces
✅ Keep monochrome with minimal accents
✅ Generate empty graph containers
✅ Follow exact sidebar hierarchy
✅ Keep topbar minimal
✅ Use subtle animations
✅ Maintain typography consistency
✅ Follow Vercel/Linear aesthetic

### DO NOT
❌ Generate fake diagrams
❌ Move sidebar items to topbar
❌ Add profile avatars
❌ Add notification bells
❌ Use gradients
❌ Use neon effects
❌ Create cyberpunk UI
❌ Generate random features
❌ Improvise navigation
❌ Add unnecessary widgets

---

**This is professional engineering intelligence software.**

---

Made with ❤️ using Bob IDE