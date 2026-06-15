import { buildReportData } from './reportDataBuilders';
import { capturePdfDiagrams } from './diagramCapture';
import { renderPdfReport } from './pdfRenderer';

export async function downloadRepositoryReportPdf({
  repoData,
  repoSize,
  aiSummary,
  quickStartGuide,
  commonIssues,
  firstContributions,
  architectureAnalysis,
  detailedArchitecture,
  codeAnalysis,
  onProgress,
  storage = window.sessionStorage
}) {
  if (!repoData) {
    throw new Error('No repository data is available to export.');
  }

  onProgress?.('Preparing report data...');
  const reportData = buildReportData({
    repoData,
    repoSize,
    aiSummary,
    quickStartGuide,
    commonIssues,
    firstContributions,
    architectureAnalysis,
    detailedArchitecture,
    codeAnalysis,
    storage
  });

  onProgress?.('Capturing diagrams...');
  const diagrams = await capturePdfDiagrams({ onProgress });

  onProgress?.('Rendering PDF...');
  const pdf = renderPdfReport(reportData, diagrams);

  onProgress?.('Saving PDF...');
  pdf.save(reportData.meta.filename);

  return {
    filename: reportData.meta.filename,
    sectionCount: reportData.sections.length,
    diagramCount: diagrams.length
  };
}
