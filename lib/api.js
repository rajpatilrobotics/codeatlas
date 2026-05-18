// ============================================
// CODEATLAS - API Client
// ============================================

/**
 * In the browser, use same-origin `/api/...` so Next.js rewrites proxy to Express
 * (avoids CORS and wrong NEXT_PUBLIC_API_URL). On the server, call API directly.
 */
function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    return ''
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
}

class ApiClient {
  async request(endpoint, options = {}) {
    const base = getApiBaseUrl()
    const url = `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // ============================================
  // REPOSITORY APIs
  // ============================================

  async analyzeRepository(url) {
    return this.request('/api/repo/analyze', {
      method: 'POST',
      body: JSON.stringify({ url }),
    })
  }

  async getRepositoryStatus(repositoryId) {
    return this.request(`/api/repo/status/${repositoryId}`)
  }

  async getRepositorySummary(repoId) {
    return this.request(`/api/repo/summary/${repoId}`)
  }

  async getRepositoryOnboarding(repoId) {
    return this.request(`/api/repo/onboarding/${repoId}`)
  }

  async listRepositories() {
    return this.request('/api/repo/list')
  }

  async deleteRepository(repoId) {
    return this.request(`/api/repo/${repoId}`, {
      method: 'DELETE',
    })
  }

  // ============================================
  // GRAPH APIs
  // ============================================

  async getRepositoryGraph(repositoryId, type = 'dependency') {
    return this.request(`/api/graph/${repositoryId}?type=${type}`)
  }

  async getArchitecture(repositoryId) {
    return this.request(`/api/graph/architecture/${repositoryId}`)
  }

  async getBlastRadius(repositoryId, entityId) {
    return this.request(`/api/graph/blast-radius/${repositoryId}?entityId=${entityId}`)
  }

  async getEntityDependencies(repositoryId, entityId) {
    return this.request(`/api/graph/dependencies/${repositoryId}/${entityId}`)
  }

  async getCircularDependencies(repositoryId) {
    return this.request(`/api/graph/circular/${repositoryId}`)
  }

  async getHeatmap(repositoryId) {
    return this.request(`/api/graph/heatmap/${repositoryId}`)
  }

  // ============================================
  // CHAT APIs
  // ============================================

  async createChatSession(repositoryId, title) {
    return this.request('/api/chat/session', {
      method: 'POST',
      body: JSON.stringify({ repositoryId, title }),
    })
  }

  async sendChatMessage(sessionId, message, options = {}) {
    return this.request('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message, ...options }),
    })
  }

  async getChatHistory(sessionId) {
    return this.request(`/api/chat/history/${sessionId}`)
  }

  async quickAsk(repositoryId, question, options = {}) {
    return this.request('/api/chat/quick-ask', {
      method: 'POST',
      body: JSON.stringify({ repositoryId, question, ...options }),
    })
  }

  async getSuggestedQuestions(sessionId) {
    return this.request(`/api/chat/suggestions/${sessionId}`)
  }

  async getChatSession(sessionId) {
    return this.request(`/api/chat/session/${sessionId}`)
  }

  async deleteChatSession(sessionId) {
    return this.request(`/api/chat/session/${sessionId}`, {
      method: 'DELETE',
    })
  }

  // ============================================
  // SECURITY APIs
  // ============================================

  async runSecurityScan(repoId) {
    return this.request('/api/security/scan', {
      method: 'POST',
      body: JSON.stringify({ repoId }),
    })
  }

  async getSecurityReport(repoId) {
    return this.request(`/api/security/report/${repoId}`)
  }

  // ============================================
  // PLANNER APIs
  // ============================================

  async analyzePlan(repoId, changes) {
    return this.request('/api/planner/analyze', {
      method: 'POST',
      body: JSON.stringify({ repoId, changes }),
    })
  }

  async getImpactAnalysis(repoId, nodeId) {
    return this.request(`/api/planner/impact/${repoId}?nodeId=${nodeId}`)
  }

  // ============================================
  // DEBUG APIs
  // ============================================

  async analyzeError(repoId, errorMessage, stackTrace) {
    return this.request('/api/debug/analyze', {
      method: 'POST',
      body: JSON.stringify({ repoId, errorMessage, stackTrace }),
    })
  }

  async getDebugSuggestions(repoId, fileId) {
    return this.request(`/api/debug/suggestions/${repoId}?fileId=${fileId}`)
  }

  // ============================================
  // HEATMAP APIs
  // ============================================

  async getComplexityHeatmap(repoId) {
    return this.request(`/api/heatmap/complexity/${repoId}`)
  }

  async getChangeFrequencyHeatmap(repoId) {
    return this.request(`/api/heatmap/changes/${repoId}`)
  }

  // ============================================
  // SYSTEM APIs
  // ============================================

  async getSystemHealth() {
    return this.request('/api/system/health')
  }

  async getSystemStats() {
    return this.request('/api/system/stats')
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export class for testing
export default ApiClient

// Made with Bob
