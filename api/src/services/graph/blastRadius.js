const { reverseTraversal, calculateDistances } = require('./traversal');

/**
 * Blast Radius Analysis
 * Calculates the impact of changes to code entities
 */

/**
 * Calculate blast radius for an entity
 * @param {Map} graph - Dependency graph
 * @param {string} entityId - Entity ID to analyze
 * @param {Object} options - Analysis options
 * @returns {Object} Blast radius analysis
 */
function calculateBlastRadius(graph, entityId, options = {}) {
  const {
    maxDepth = 5,
    includeIndirect = true,
    calculateRisk = true
  } = options;

  // Find all entities that depend on this one
  const affectedNodes = reverseTraversal(graph, entityId, {
    maxDepth,
    includeIndirect
  });

  // Calculate distances
  const distances = calculateDistances(graph, entityId);

  // Group by depth
  const byDepth = {};
  affectedNodes.forEach(({ node, depth }) => {
    if (!byDepth[depth]) {
      byDepth[depth] = [];
    }
    byDepth[depth].push(node);
  });

  // Calculate risk levels
  const riskLevels = calculateRisk ? 
    calculateRiskLevels(affectedNodes, distances) : 
    {};

  return {
    entityId,
    totalAffected: affectedNodes.length,
    maxDepth: Math.max(...affectedNodes.map(n => n.depth), 0),
    affectedNodes: affectedNodes.map(n => n.node),
    byDepth,
    riskLevels,
    directDependents: byDepth[1] || [],
    indirectDependents: affectedNodes
      .filter(n => n.depth > 1)
      .map(n => n.node)
  };
}

/**
 * Calculate risk levels for affected nodes
 * @param {Array} affectedNodes - Affected nodes
 * @param {Map} distances - Node distances
 * @returns {Object} Risk levels
 */
function calculateRiskLevels(affectedNodes, distances) {
  const riskLevels = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };

  affectedNodes.forEach(({ node, depth }) => {
    if (depth === 1) {
      riskLevels.critical.push(node);
    } else if (depth === 2) {
      riskLevels.high.push(node);
    } else if (depth === 3) {
      riskLevels.medium.push(node);
    } else {
      riskLevels.low.push(node);
    }
  });

  return riskLevels;
}

/**
 * Calculate impact score for an entity
 * @param {Map} graph - Dependency graph
 * @param {string} entityId - Entity ID
 * @returns {number} Impact score (0-100)
 */
function calculateImpactScore(graph, entityId) {
  const blastRadius = calculateBlastRadius(graph, entityId, {
    maxDepth: 5,
    calculateRisk: true
  });

  // Calculate score based on:
  // - Number of affected nodes
  // - Depth of impact
  // - Risk distribution

  const totalAffected = blastRadius.totalAffected;
  const maxDepth = blastRadius.maxDepth;
  const criticalCount = blastRadius.riskLevels.critical?.length || 0;
  const highCount = blastRadius.riskLevels.high?.length || 0;

  // Weighted score
  const affectedScore = Math.min(totalAffected * 2, 40);
  const depthScore = Math.min(maxDepth * 5, 20);
  const criticalScore = Math.min(criticalCount * 10, 25);
  const highScore = Math.min(highCount * 5, 15);

  const totalScore = affectedScore + depthScore + criticalScore + highScore;

  return Math.min(Math.round(totalScore), 100);
}

/**
 * Find critical paths (paths with highest impact)
 * @param {Map} graph - Dependency graph
 * @param {string} entityId - Entity ID
 * @param {number} topN - Number of paths to return
 * @returns {Array} Critical paths
 */
function findCriticalPaths(graph, entityId, topN = 5) {
  const blastRadius = calculateBlastRadius(graph, entityId, {
    maxDepth: 5,
    includeIndirect: true
  });

  // Score each affected node by its impact
  const scoredNodes = blastRadius.affectedNodes.map(node => {
    const nodeBlastRadius = calculateBlastRadius(graph, node, {
      maxDepth: 3,
      calculateRisk: false
    });

    return {
      node,
      score: nodeBlastRadius.totalAffected,
      depth: blastRadius.byDepth[1]?.includes(node) ? 1 : 2
    };
  });

  // Sort by score and return top N
  return scoredNodes
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/**
 * Analyze change impact for multiple entities
 * @param {Map} graph - Dependency graph
 * @param {Array} entityIds - Entity IDs to analyze
 * @returns {Object} Combined impact analysis
 */
function analyzeMultipleChanges(graph, entityIds) {
  const individualImpacts = entityIds.map(id => ({
    entityId: id,
    ...calculateBlastRadius(graph, id, { maxDepth: 5 })
  }));

  // Find overlapping impacts
  const allAffected = new Set();
  individualImpacts.forEach(impact => {
    impact.affectedNodes.forEach(node => allAffected.add(node));
  });

  // Calculate combined risk
  const combinedRisk = {
    critical: new Set(),
    high: new Set(),
    medium: new Set(),
    low: new Set()
  };

  individualImpacts.forEach(impact => {
    Object.keys(impact.riskLevels).forEach(level => {
      impact.riskLevels[level]?.forEach(node => {
        combinedRisk[level].add(node);
      });
    });
  });

  return {
    entityIds,
    individualImpacts,
    totalAffected: allAffected.size,
    combinedRisk: {
      critical: Array.from(combinedRisk.critical),
      high: Array.from(combinedRisk.high),
      medium: Array.from(combinedRisk.medium),
      low: Array.from(combinedRisk.low)
    },
    overlapAnalysis: analyzeOverlap(individualImpacts)
  };
}

/**
 * Analyze overlap between impacts
 * @param {Array} impacts - Individual impacts
 * @returns {Object} Overlap analysis
 */
function analyzeOverlap(impacts) {
  const affectedSets = impacts.map(i => new Set(i.affectedNodes));
  const overlaps = [];

  for (let i = 0; i < affectedSets.length; i++) {
    for (let j = i + 1; j < affectedSets.length; j++) {
      const intersection = new Set(
        [...affectedSets[i]].filter(x => affectedSets[j].has(x))
      );

      if (intersection.size > 0) {
        overlaps.push({
          entities: [impacts[i].entityId, impacts[j].entityId],
          sharedAffected: Array.from(intersection),
          count: intersection.size
        });
      }
    }
  }

  return overlaps;
}

/**
 * Generate blast radius visualization data
 * @param {Map} graph - Dependency graph
 * @param {string} entityId - Entity ID
 * @param {Object} entityMap - Entity metadata map
 * @returns {Object} Visualization data for React Flow
 */
function generateBlastRadiusVisualization(graph, entityId, entityMap = new Map()) {
  const blastRadius = calculateBlastRadius(graph, entityId, {
    maxDepth: 5,
    calculateRisk: true
  });

  const nodes = [];
  const edges = [];

  // Add center node
  const centerEntity = entityMap.get(entityId);
  nodes.push({
    id: entityId,
    type: 'center',
    data: {
      label: centerEntity?.name || entityId,
      risk: 'source',
      ...centerEntity
    },
    position: { x: 400, y: 300 }
  });

  // Add affected nodes by depth
  Object.entries(blastRadius.byDepth).forEach(([depth, nodeIds]) => {
    const depthNum = parseInt(depth);
    const angleStep = (2 * Math.PI) / nodeIds.length;
    const radius = 150 * depthNum;

    nodeIds.forEach((nodeId, index) => {
      const angle = index * angleStep;
      const entity = entityMap.get(nodeId);

      // Determine risk level
      let risk = 'low';
      if (blastRadius.riskLevels.critical?.includes(nodeId)) risk = 'critical';
      else if (blastRadius.riskLevels.high?.includes(nodeId)) risk = 'high';
      else if (blastRadius.riskLevels.medium?.includes(nodeId)) risk = 'medium';

      nodes.push({
        id: nodeId,
        type: 'affected',
        data: {
          label: entity?.name || nodeId,
          risk,
          depth: depthNum,
          ...entity
        },
        position: {
          x: 400 + Math.cos(angle) * radius,
          y: 300 + Math.sin(angle) * radius
        }
      });
    });
  });

  // Add edges
  blastRadius.affectedNodes.forEach(nodeId => {
    const neighbors = graph.get(nodeId) || [];
    neighbors.forEach(neighbor => {
      if (blastRadius.affectedNodes.includes(neighbor) || neighbor === entityId) {
        edges.push({
          id: `${nodeId}-${neighbor}`,
          source: neighbor,
          target: nodeId,
          type: 'dependency',
          animated: true
        });
      }
    });
  });

  return {
    nodes,
    edges,
    statistics: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      ...blastRadius
    }
  };
}

module.exports = {
  calculateBlastRadius,
  calculateImpactScore,
  findCriticalPaths,
  analyzeMultipleChanges,
  generateBlastRadiusVisualization
};

// Made with Bob
