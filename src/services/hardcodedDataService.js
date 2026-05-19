// Hardcoded Data Service - DEPRECATED
// This service has been replaced with aiContentService.js
// which generates real AI content based on repository context
// 
// This file is kept for backward compatibility but should not be used
// All hardcoded mock data has been removed per the migration plan

export const HARDCODED_AI_SUMMARY = '';
export const HARDCODED_QUICK_START = '';
export const HARDCODED_COMMON_ISSUES = '';
export const HARDCODED_FIRST_CONTRIBUTIONS = [];
export const HARDCODED_ARCHITECTURE_ANALYSIS = '';
export const HARDCODED_SECURITY_DATA = null;
export const HARDCODED_ONBOARDING_GUIDE = null;

// Deprecated functions - throw errors to prevent usage
export const getHardcodedAISummary = async () => {
  throw new Error('getHardcodedAISummary is deprecated. Use generateAISummary from aiContentService.js instead.');
};

export const getHardcodedQuickStart = async () => {
  throw new Error('getHardcodedQuickStart is deprecated. Use generateQuickStart from aiContentService.js instead.');
};

export const getHardcodedCommonIssues = async () => {
  throw new Error('getHardcodedCommonIssues is deprecated. Use generateCommonIssues from aiContentService.js instead.');
};

export const getHardcodedFirstContributions = async () => {
  throw new Error('getHardcodedFirstContributions is deprecated. Use generateFirstContributions from aiContentService.js instead.');
};

export const getHardcodedArchitectureAnalysis = async () => {
  throw new Error('getHardcodedArchitectureAnalysis is deprecated. Use generateArchitectureAnalysis from aiContentService.js instead.');
};

export const getHardcodedSecurityData = async () => {
  throw new Error('getHardcodedSecurityData is deprecated. Use generateSecurityAnalysis from aiContentService.js instead.');
};

export const getHardcodedOnboardingGuide = async () => {
  throw new Error('getHardcodedOnboardingGuide is deprecated. Use generateOnboardingGuide from aiContentService.js instead.');
};

// Made with Bob
