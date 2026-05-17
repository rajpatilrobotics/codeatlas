// ============================================
// CODEATLAS - UI State Store (Zustand)
// ============================================

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

const useUIStore = create(
  devtools(
    (set, get) => ({
      // ============================================
      // STATE
      // ============================================
      
      // Sidebar state
      sidebarCollapsed: false,
      
      // Command palette
      commandPaletteOpen: false,
      
      // Modals
      modals: {
        analyzeRepo: false,
        createWorkspace: false,
        settings: false,
        help: false,
      },
      
      // Notifications
      notifications: [],
      
      // Loading states
      loading: {
        global: false,
        repo: false,
        graph: false,
        chat: false,
      },
      
      // Theme
      theme: 'dark', // 'dark' | 'light'
      
      // Layout
      layout: {
        leftPanelWidth: 280,
        rightPanelWidth: 320,
        bottomPanelHeight: 300,
      },
      
      // Active panels
      activePanels: {
        left: true,
        right: false,
        bottom: false,
      },
      
      // Graph settings
      graphSettings: {
        showLabels: true,
        showMinimap: true,
        animateTransitions: true,
        nodeSize: 'medium', // 'small' | 'medium' | 'large'
        edgeStyle: 'bezier', // 'bezier' | 'straight' | 'step'
      },

      // ============================================
      // ACTIONS - Sidebar
      // ============================================
      
      toggleSidebar: () => set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed,
      })),
      
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // ============================================
      // ACTIONS - Command Palette
      // ============================================
      
      openCommandPalette: () => set({ commandPaletteOpen: true }),
      
      closeCommandPalette: () => set({ commandPaletteOpen: false }),
      
      toggleCommandPalette: () => set((state) => ({
        commandPaletteOpen: !state.commandPaletteOpen,
      })),

      // ============================================
      // ACTIONS - Modals
      // ============================================
      
      openModal: (modalName) => set((state) => ({
        modals: { ...state.modals, [modalName]: true },
      })),
      
      closeModal: (modalName) => set((state) => ({
        modals: { ...state.modals, [modalName]: false },
      })),
      
      closeAllModals: () => set({
        modals: {
          analyzeRepo: false,
          createWorkspace: false,
          settings: false,
          help: false,
        },
      }),

      // ============================================
      // ACTIONS - Notifications
      // ============================================
      
      addNotification: (notification) => set((state) => ({
        notifications: [
          ...state.notifications,
          {
            id: Date.now().toString(),
            timestamp: Date.now(),
            ...notification,
          },
        ],
      })),
      
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      })),
      
      clearNotifications: () => set({ notifications: [] }),
      
      // Helper methods for common notification types
      showSuccess: (message, title = 'Success') => {
        get().addNotification({
          type: 'success',
          title,
          message,
          duration: 3000,
        })
      },
      
      showError: (message, title = 'Error') => {
        get().addNotification({
          type: 'error',
          title,
          message,
          duration: 5000,
        })
      },
      
      showWarning: (message, title = 'Warning') => {
        get().addNotification({
          type: 'warning',
          title,
          message,
          duration: 4000,
        })
      },
      
      showInfo: (message, title = 'Info') => {
        get().addNotification({
          type: 'info',
          title,
          message,
          duration: 3000,
        })
      },

      // ============================================
      // ACTIONS - Loading States
      // ============================================
      
      setLoading: (key, value) => set((state) => ({
        loading: { ...state.loading, [key]: value },
      })),
      
      setGlobalLoading: (value) => set((state) => ({
        loading: { ...state.loading, global: value },
      })),

      // ============================================
      // ACTIONS - Theme
      // ============================================
      
      setTheme: (theme) => set({ theme }),
      
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'dark' ? 'light' : 'dark',
      })),

      // ============================================
      // ACTIONS - Layout
      // ============================================
      
      setLeftPanelWidth: (width) => set((state) => ({
        layout: { ...state.layout, leftPanelWidth: width },
      })),
      
      setRightPanelWidth: (width) => set((state) => ({
        layout: { ...state.layout, rightPanelWidth: width },
      })),
      
      setBottomPanelHeight: (height) => set((state) => ({
        layout: { ...state.layout, bottomPanelHeight: height },
      })),
      
      togglePanel: (panel) => set((state) => ({
        activePanels: {
          ...state.activePanels,
          [panel]: !state.activePanels[panel],
        },
      })),
      
      setPanel: (panel, active) => set((state) => ({
        activePanels: { ...state.activePanels, [panel]: active },
      })),

      // ============================================
      // ACTIONS - Graph Settings
      // ============================================
      
      updateGraphSettings: (settings) => set((state) => ({
        graphSettings: { ...state.graphSettings, ...settings },
      })),
      
      toggleGraphLabels: () => set((state) => ({
        graphSettings: {
          ...state.graphSettings,
          showLabels: !state.graphSettings.showLabels,
        },
      })),
      
      toggleGraphMinimap: () => set((state) => ({
        graphSettings: {
          ...state.graphSettings,
          showMinimap: !state.graphSettings.showMinimap,
        },
      })),
      
      toggleGraphAnimations: () => set((state) => ({
        graphSettings: {
          ...state.graphSettings,
          animateTransitions: !state.graphSettings.animateTransitions,
        },
      })),

      // ============================================
      // ACTIONS - Reset
      // ============================================
      
      reset: () => set({
        sidebarCollapsed: false,
        commandPaletteOpen: false,
        modals: {
          analyzeRepo: false,
          createWorkspace: false,
          settings: false,
          help: false,
        },
        notifications: [],
        loading: {
          global: false,
          repo: false,
          graph: false,
          chat: false,
        },
        theme: 'dark',
        layout: {
          leftPanelWidth: 280,
          rightPanelWidth: 320,
          bottomPanelHeight: 300,
        },
        activePanels: {
          left: true,
          right: false,
          bottom: false,
        },
        graphSettings: {
          showLabels: true,
          showMinimap: true,
          animateTransitions: true,
          nodeSize: 'medium',
          edgeStyle: 'bezier',
        },
      }),
    }),
    { name: 'UIStore' }
  )
)

export default useUIStore

// Made with Bob
