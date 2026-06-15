# Onboarding Guide v2

## 1. Goal
Redesign the Onboarding Guide into an evidence-backed new-contributor checklist for the currently analyzed repository.

## 2. Problem
The current guide relies on generic generated steps, a global onboarding cache, and UI copy that can feel hard-coded instead of grounded in repository analysis.

## 3. Proposed solution
Build a deterministic v2 guide model from existing repository analysis data, then render it as a guided checklist with per-repository progress, setup guidance, reading path, code landmarks, read-only risk highlights, and first contribution suggestions.

## 4. Files to change
- `src/components/TabContent/OnboardingGuide.jsx`
- `src/utils/onboardingGuideModel.js`
- `src/utils/onboardingGuideModel.test.js`
- `src/App.jsx`
- `src/services/aiContentService.js`

## 5. Step by step tasks
1. Done: Add the pure onboarding guide model helper and tests.
2. Done: Refactor the Onboarding Guide screen to consume the v2 model instead of cached generated steps.
3. Done: Pass the existing analysis outputs into the Onboarding Guide from `App.jsx`.
4. Done: Update the AI onboarding fallback to use the same evidence-backed model.
5. Done: Build and verify the app.

## 6. Acceptance criteria
- Onboarding Guide shows useful empty state before repository analysis.
- After analysis, the guide is based on `repoData`, `codeAnalysis`, `detailedArchitecture`, quick start, common issues, and first contributions.
- Progress persists per repository and does not use the old global `onboarding_guide_cache`.
- No dashboard mock data appears in the guide.
- Existing restricted feature areas are not changed.

## 7. Testing plan
- Run `npm test -- --watchAll=false`.
- Run `npm run build`.
- Manually inspect the Onboarding Guide on `http://localhost:3004`.

## 8. Open questions
- None for this implementation pass. The user approved the hybrid evidence-plus-AI direction and per-repository progress.
