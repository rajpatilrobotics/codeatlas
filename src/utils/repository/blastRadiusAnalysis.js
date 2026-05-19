/**
 * Blast Radius Analysis
 * Calculates impact of changes based on dependency graph
 */

/**
 * Calculate blast radius for a given file change
 */
export function calculateBlastRadius(changedFile, fileStructure, imports) {
  if (!changedFile || !fileStructure) {
    return {
      severity: 'low',
      impactedFiles: [],
      impactedServices: [],
      dependencyChains: [],
      totalImpact: 0
    };
  }

  const impactedFiles = new Set();
  const impactedServices = new Set();
  const dependencyChains = [];

  // Add the changed file itself
  impactedFiles.add(changedFile);

  // Find files that import the changed file
  if (imports) {
    imports.forEach(imp => {
      const { source } = imp;
      if (source.includes(changedFile) || changedFile.includes(source)) {
        impactedFiles.add(source);
      }
    });
  }

  // Find related files based on directory structure
  const changedDir = changedFile.split('/').slice(0, -1).join('/');
  fileStructure.forEach(file => {
    const path = file.path || file;
    const fileDir = path.split('/').slice(0, -1).join('/');

    // Files in the same directory are likely related
    if (fileDir === changedDir && path !== changedFile) {
      impactedFiles.add(path);
    }

    // Files in parent/child directories
    if (fileDir.startsWith(changedDir) || changedDir.startsWith(fileDir)) {
      impactedFiles.add(path);
    }
  });

  // Identify impacted services
  impactedFiles.forEach(file => {
    if (file.includes('services') || file.includes('api')) {
      const serviceName = file.split('/').pop();
      impactedServices.add(serviceName);
    }
  });

  // Build dependency chains
  const chains = [];
  impactedFiles.forEach(file => {
    if (file !== changedFile) {
      chains.push([changedFile, file]);
    }
  });

  // Calculate severity based on impact
  const totalImpact = impactedFiles.size + (impactedServices.size * 2);
  let severity = 'low';
  if (totalImpact > 20) severity = 'critical';
  else if (totalImpact > 10) severity = 'high';
  else if (totalImpact > 5) severity = 'medium';

  return {
    severity,
    impactedFiles: Array.from(impactedFiles),
    impactedServices: Array.from(impactedServices),
    dependencyChains: chains,
    totalImpact
  };
}

/**
 * Calculate blast radius for multiple file changes
 */
export function calculateMultiFileBlastRadius(changedFiles, fileStructure, imports) {
  if (!changedFiles || !Array.isArray(changedFiles)) {
    return calculateBlastRadius('', fileStructure, imports);
  }

  const allImpactedFiles = new Set();
  const allImpactedServices = new Set();
  const allChains = [];

  changedFiles.forEach(file => {
    const result = calculateBlastRadius(file, fileStructure, imports);
    result.impactedFiles.forEach(f => allImpactedFiles.add(f));
    result.impactedServices.forEach(s => allImpactedServices.add(s));
    allChains.push(...result.dependencyChains);
  });

  const totalImpact = allImpactedFiles.size + (allImpactedServices.size * 2);
  let severity = 'low';
  if (totalImpact > 30) severity = 'critical';
  else if (totalImpact > 15) severity = 'high';
  else if (totalImpact > 8) severity = 'medium';

  return {
    severity,
    impactedFiles: Array.from(allImpactedFiles),
    impactedServices: Array.from(allImpactedServices),
    dependencyChains: allChains,
    totalImpact
  };
}

/**
 * Get blast radius visualization data
 */
export function getBlastRadiusVisualization(blastRadius) {
  const { severity, impactedFiles, impactedServices } = blastRadius;

  const severityColors = {
    low: '#4CAF50',
    medium: '#FF9800',
    high: '#F44336',
    critical: '#9C27B0'
  };

  const rings = [];

  // Center ring (changed files)
  rings.push({
    radius: 1,
    items: impactedFiles.slice(0, 5),
    color: severityColors[severity]
  });

  // Second ring (services)
  if (impactedServices.length > 0) {
    rings.push({
      radius: 2,
      items: impactedServices,
      color: severityColors[severity]
    });
  }

  // Third ring (other files)
  if (impactedFiles.length > 5) {
    rings.push({
      radius: 3,
      items: impactedFiles.slice(5, 15),
      color: severityColors[severity]
    });
  }

  return {
    rings,
    severityColor: severityColors[severity],
    totalItems: impactedFiles.length + impactedServices.length
  };
}

/**
 * Get AI-enhanced blast radius reasoning
 */
export async function getBlastRadiusReasoning(blastRadius, repoData) {
  if (!blastRadius || !repoData) {
    return '';
  }

  const { severity, impactedFiles, impactedServices, totalImpact } = blastRadius;

  const prompt = `You are a software architect. Analyze the blast radius of a code change.

Repository: ${repoData.repoInfo?.name || 'Unknown'}
Changed Files: ${impactedFiles.slice(0, 10).join(', ')}
Impacted Services: ${impactedServices.join(', ')}
Severity Level: ${severity}
Total Impact Score: ${totalImpact}

Provide a brief analysis (max 150 words) covering:
1. Why this change has ${severity} impact
2. Which services are most at risk
3. Recommended testing approach
4. Potential rollback strategy

Be specific and actionable.`;

  try {
    const { generateText } = await import('../../services/ai/aiService.js');
    const reasoning = await generateText(prompt, {
      temperature: 0.6,
      maxTokens: 300
    });
    return reasoning;
  } catch (error) {
    console.error('Error generating blast radius reasoning:', error);
    return '';
  }
}

export default {
  calculateBlastRadius,
  calculateMultiFileBlastRadius,
  getBlastRadiusVisualization,
  getBlastRadiusReasoning
};
