"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Check for saved theme preference or default to system preference
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Check system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(systemPrefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    if (theme === 'dark') {
      // Core colors
      root.style.setProperty('--background', '#181a1a'); // onyx-100
      root.style.setProperty('--foreground', '#eef0f1'); // onyx-40
      root.style.setProperty('--surface', '#353839'); // onyx-90
      root.style.setProperty('--surface-hover', '#555950'); // onyx-80
      root.style.setProperty('--muted', '#9ba2a5'); // onyx-60
      
      // Accent colors
      root.style.setProperty('--accent', '#3b82f6'); // blue-50
      root.style.setProperty('--accent-hover', '#60a5fa'); // blue-40
      root.style.setProperty('--info', '#3b82f6'); // blue-50
      
      // Borders
      root.style.setProperty('--border', '#777d7f'); // onyx-70
      
      // Header & Navigation
      root.style.setProperty('--header-bg', 'rgba(53, 56, 57, 0.9)'); // onyx-100 with opacity
      root.style.setProperty('--header-text', '#eef0f1'); // onyx-40
      root.style.setProperty('--header-border', 'rgba(24, 26, 26, 0)'); // onyx-70
      root.style.setProperty('--logo-color', '#eef0f1'); // onyx-40
      
      // Buttons & Interactive
      root.style.setProperty('--button-bg', '#353839'); // onyx-90
      root.style.setProperty('--button-text', '#eef0f1'); // onyx-40
      root.style.setProperty('--button-hover-bg', '#555950'); // onyx-80
      root.style.setProperty('--button-hover-text', '#eef0f1');
      root.style.setProperty('--button-border', '#777d7f'); // onyx-70

      // Primary & Secondary Button Colors (Dark Mode)
      root.style.setProperty('--primary-button-bg', '#c0c9cc'); // onyx-50
      root.style.setProperty('--primary-button-text', '#181a1a');
      root.style.setProperty('--primary-button-hover-bg', '#eef0f1'); // blue-40
      root.style.setProperty('--primary-button-hover-text', '#353839');
      root.style.setProperty('--secondary-button-bg', 'transparent'); // onyx-80
      root.style.setProperty('--secondary-button-text', '#F3F4F5'); // onyx-40
      root.style.setProperty('--secondary-button-hover-bg', 'transparent'); // onyx-70
      root.style.setProperty('--secondary-button-hover-text', '#c0c9cc');
      root.style.setProperty('--primary-button-border', 'transparent'); // blue-50
      root.style.setProperty('--primary-button-hover-border', 'transparent'); // blue-40
      root.style.setProperty('--secondary-button-border', '#777d7f'); // onyx-70
      root.style.setProperty('--secondary-button-hover-border', '#9ba2a5'); // onyx-60
      
      // Status Colors
      root.style.setProperty('--success', '#64FF58'); // green-40
      root.style.setProperty('--warning', '#ff8044'); // warning color
      root.style.setProperty('--error', '#FC7C7C'); // red-60
      
      // Featured Section (keep white text for contrast)
      root.style.setProperty('--featured-overlay', 'rgba(0, 0, 0, 0.8)');
      root.style.setProperty('--featured-overlay-light', 'rgba(0, 0, 0, 0.4)');
      root.style.setProperty('--featured-overlay-transparent', 'transparent');
      root.style.setProperty('--featured-badge-text', '#ffffff');
      root.style.setProperty('--featured-badge-dot', '#ffffff');
      root.style.setProperty('--featured-title', '#ffffff');
      root.style.setProperty('--featured-description', '#ffffff');
      root.style.setProperty('--featured-tag-bg', 'rgba(255, 255, 255, 0.2)');
      root.style.setProperty('--featured-tag-text', '#ffffff');
      root.style.setProperty('--featured-secondary-button-bg', 'rgba(255, 255, 255, 0.2)');
      root.style.setProperty('--featured-secondary-button-text', '#ffffff');
      root.style.setProperty('--featured-secondary-button-border', 'rgba(255, 255, 255, 0.3)');
      root.style.setProperty('--featured-secondary-button-hover-bg', 'rgba(255, 255, 255, 0.3)');
      
      // Exercise Cards
      root.style.setProperty('--card-bg', '#353839'); // onyx-90
      root.style.setProperty('--card-overlay', 'rgba(0, 0, 0, 0.8)');
      root.style.setProperty('--card-title', '#ffffff');
      root.style.setProperty('--card-description', '#ffffff');
      root.style.setProperty('--play-icon-bg', 'rgba(0, 0, 0, 0.5)');
      root.style.setProperty('--play-icon-text', '#ffffff');
      
      // Carousel
      root.style.setProperty('--carousel-arrow-bg', 'rgba(53, 56, 57, 0.9)');
      root.style.setProperty('--carousel-arrow-hover-bg', '#353839');
      root.style.setProperty('--carousel-arrow-text', '#ffffff');
      root.style.setProperty('--carousel-fade', 'rgba(0, 0, 0, 0.42)');
      
      // Section Headers
      root.style.setProperty('--section-title', '#F3F4F5'); // onyx-40
      root.style.setProperty('--section-subtitle', '#c0c9cc'); // onyx-50
      root.style.setProperty('--section-accent', '#c0c9cc'); // onyx-50
      
      // Exercise Detail Tags (Dark Mode)
      root.style.setProperty('--tag-bg', '#c0c9cc'); // light gray background
      root.style.setProperty('--tag-text', '#181a1a'); // dark text

      // Video Player Controls (Dark)
      root.style.setProperty('--vp-bg', '#23272e'); // main control bg
      root.style.setProperty('--vp-border', '#444851');
      root.style.setProperty('--vp-dropdown-bg', '#181a1a');
      root.style.setProperty('--vp-dropdown-border', '#f3f3f4');
      root.style.setProperty('--vp-dropdown-shadow', '0 4px 24px 0 rgba(0,0,0,0.45)');
      root.style.setProperty('--vp-dropdown-item-bg', '#181a1a');
      root.style.setProperty('--vp-dropdown-item-hover-bg', '#353839');
      root.style.setProperty('--vp-dropdown-item-text', '#eef0f1');
      root.style.setProperty('--vp-button-bg', 'rgba(0,0,0,0.1)');
      root.style.setProperty('--vp-button-hover-bg', '#55595b');
      root.style.setProperty('--vp-button-text', '#eef0f1');
      root.style.setProperty('--vp-button-border', '#f3f3f4');
      root.style.setProperty('--vp-slider-bg', '#353839');
      root.style.setProperty('--vp-slider-thumb', '#3b82f6');
      root.style.setProperty('--vp-slider-active', '#60a5fa');
      root.style.setProperty('--vp-label', '#c0c9cc');
      root.style.setProperty('--vp-focus-bg', '#23272e');
      root.style.setProperty('--vp-focus-text', '#eef0f1');
      // Video Player Tabs (Dark)
      root.style.setProperty('--vp-tab-active', '#c0c9cc');
      root.style.setProperty('--vp-tab-inactive', '#777d7f');
      // Video Player Tab Borders & Backgrounds (Dark)
      root.style.setProperty('--vp-tab-border-active', 'transparent');
      root.style.setProperty('--vp-tab-border-inactive', 'transparent');
      root.style.setProperty('--vp-tab-bg-active', '#353839');
      root.style.setProperty('--vp-tab-bg-inactive', 'transparent');
      // Dropdown label and chevron (Dark)
      root.style.setProperty('--vp-dropdown-label', '#c0c9cc');
      root.style.setProperty('--vp-dropdown-chevron', '#c0c9cc');
      root.style.setProperty('--vp-panel-border', '#55595b');
      root.style.setProperty('--vp-panel-bg', '#23272e');
      root.style.setProperty('--vp-panel-shadow', '0 4px 24px 0 rgba(0,0,0,0.45)');
      root.style.setProperty('--vp-panel-title', '#eef0f1');
      root.style.setProperty('--vp-panel-border', '#353839');
      root.style.setProperty('--vp-panel-divider', '#353839');
      root.style.setProperty('--vp-panel-icon-bg', '#353839');
      root.style.setProperty('--vp-panel-icon-active-bg', '#c0c9cc');
      root.style.setProperty('--vp-panel-icon', '#eef0f1');
      root.style.setProperty('--vp-panel-icon-active', '#fff');
      root.style.setProperty('--vp-panel-icon-border', '#C0C9CC');
      
      // Accordion (Dark Mode)
      root.style.setProperty('--accordion-bg', 'transparent'); // onyx-90
      root.style.setProperty('--accordion-border', '#55595b'); // onyx-80
      root.style.setProperty('--accordion-hover-bg', '#353839'); // onyx-90
      root.style.setProperty('--accordion-text', '#eef0f1'); // onyx-40
      root.style.setProperty('--accordion-chevron', '#c0c9cc'); // onyx-50
      root.style.setProperty('--accordion-shadow', '0 1px 3px 0 rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--accordion-shadow-hover', '0 0px 0px 0px rgba(0, 0, 0, 0.4)');
      // Tooltip (Dark Mode)
      root.style.setProperty('--tooltip-bg', '#353839'); // dark background
      root.style.setProperty('--tooltip-text', '#eef0f1'); // light text
      root.style.setProperty('--tooltip-border', '#D7D8D9'); // subtle border
      root.style.setProperty('--tooltip-shadow', '0 4px 24px 0 rgba(0,0,0,0.45)');
      // Results Page Tabs (Dark)
      root.style.setProperty('--results-tab-bg-active', '#353839');
      root.style.setProperty('--results-tab-bg-inactive', 'transparent');
      root.style.setProperty('--results-tab-text-active', '#eef0f1');
      root.style.setProperty('--results-tab-text-inactive', '#c0c9cc');
      root.style.setProperty('--results-tab-border-active', 'transparent');
      root.style.setProperty('--results-tab-border-inactive', 'transparent');
      root.style.setProperty('--results-tab-hover-bg', '#23272e');
      root.style.setProperty('--results-tab-hover-text', '#eef0f1');
      root.style.setProperty('--results-tab-hover-border', '#c0c9cc');
      root.style.setProperty('--results-tabs-border-color', '#9ba2a5');
      // Results Page Summary Card (Dark)
      root.style.setProperty('--results-summary-bg', 'transparent');
      root.style.setProperty('--results-summary-border', '#9ba2a5');
      root.style.setProperty('--results-summary-title', '#eef0f1');
      root.style.setProperty('--results-summary-info-bg', '#353839');
      root.style.setProperty('--results-summary-info-text', '#c0c9cc');
      root.style.setProperty('--results-summary-shadow', '0 2px 12px 0 rgba(0,0,0,0.18)');
      // Results Page Info Icon (Dark)
      root.style.setProperty('--results-info-icon', '#c0c9cc');
      root.style.setProperty('--results-info-icon-hover', '#3B82F6');
      // Results Page Chart Internals (Dark)
      root.style.setProperty('--results-chart-bg', '#23272e');
      root.style.setProperty('--results-chart-axis', '#c0c9cc');
      root.style.setProperty('--results-chart-grid', '#353839');
      root.style.setProperty('--results-chart-tooltip-bg', '#353839');
      root.style.setProperty('--results-chart-tooltip-text', '#eef0f1');
      root.style.setProperty('--results-chart-legend', '#c0c9cc');
      root.style.setProperty('--results-chart-cursor', '#3B82F6');
      // Results Page Chart Series Colors (Dark)
      root.style.setProperty('--results-chart-series-1', '#F81818');
      root.style.setProperty('--results-chart-series-2', '#22D3EE');
      root.style.setProperty('--results-chart-series-3', '#F59E42');
      root.style.setProperty('--results-chart-series-4', '#F97316');
      root.style.setProperty('--results-chart-series-5', '#A78BFA');
      root.style.setProperty('--results-chart-series-6', '#F472B6');
      root.style.setProperty('--results-chart-series-7', '#34D399');
      root.style.setProperty('--results-chart-series-8', '#F87171');
      // Chart cursor, highlight, selection (Dark)
      root.style.setProperty('--results-chart-highlight', '#F59E42');
      root.style.setProperty('--results-chart-selection', '#22D3EE');
    } else {
      // Light mode - reset to original values
      root.style.setProperty('--background', '#c0c9cc'); // onyx-50
      root.style.setProperty('--foreground', '#353839'); // onyx-90
      root.style.setProperty('--surface', '#353839'); // onyx-90
      root.style.setProperty('--surface-hover', '#f4eedd'); // ap-30
      root.style.setProperty('--muted', '#9ba2a5'); // ap-70
      
      // Accent colors
      root.style.setProperty('--accent', '#3b82f6'); // blue-50
      root.style.setProperty('--accent-hover', '#2563eb'); // blue-60
      root.style.setProperty('--info', '#3b82f6'); // blue-50
      
      // Borders
      root.style.setProperty('--border', '#c0c9cc'); // onyx-50
      
      // Header & Navigation
      root.style.setProperty('--header-bg', 'rgba(238, 240, 241, 0.9)'); // ap-10 with opacity
      root.style.setProperty('--header-text', '#17150f'); // ap-100
      root.style.setProperty('--header-border', 'rgba(238, 240, 241, 0.0)'); // ap-50
      root.style.setProperty('--logo-color', '#17150f'); // ap-100
      
      // Buttons & Interactive
      root.style.setProperty('--button-bg', '#f6f1e3'); // ap-10
      root.style.setProperty('--button-text', '#17150f'); // ap-100
      root.style.setProperty('--button-hover-bg', '#f4eedd'); // ap-30
      root.style.setProperty('--button-hover-text', '#17150f'); // ap-100
      root.style.setProperty('--button-border', '#ccc19e'); // ap-50

      // Primary & Secondary Button Colors (Light Mode)
      root.style.setProperty('--primary-button-bg', '#181a1a'); // onyx-100
      root.style.setProperty('--primary-button-text', '#c0c9cc');
      root.style.setProperty('--primary-button-hover-bg', '#353839'); // onyx-90
      root.style.setProperty('--primary-button-hover-text', '#D7D8D9');
      root.style.setProperty('--secondary-button-bg', '#c0c9cc'); // onyx-90
      root.style.setProperty('--secondary-button-text', '#181a1a'); // ap-100
      root.style.setProperty('--secondary-button-hover-bg', '#c0c9cc'); // onyx-50
      root.style.setProperty('--secondary-button-hover-text', '#353839');
      root.style.setProperty('--primary-button-border', 'transparent'); // onyx-90
      root.style.setProperty('--primary-button-hover-border', 'transparent'); // ap-100
      root.style.setProperty('--secondary-button-border', '#353839'); // onyx-60
      root.style.setProperty('--secondary-button-hover-border', '#777d7f'); // onyx-70
      
      // Status Colors
      root.style.setProperty('--success', '#64FF58'); // green-40
      root.style.setProperty('--warning', '#ff8044'); // warning color
      root.style.setProperty('--error', '#FC7C7C'); // red-60
      
      // Featured Section
      root.style.setProperty('--featured-overlay', 'rgba(0, 0, 0, 0.8)');
      root.style.setProperty('--featured-overlay-light', 'rgba(0, 0, 0, 0.4)');
      root.style.setProperty('--featured-overlay-transparent', 'transparent');
      root.style.setProperty('--featured-badge-text', '#ffffff');
      root.style.setProperty('--featured-badge-dot', '#ffffff');
      root.style.setProperty('--featured-title', '#ffffff');
      root.style.setProperty('--featured-description', '#ffffff');
      root.style.setProperty('--featured-tag-bg', 'rgba(255, 255, 255, 0.2)');
      root.style.setProperty('--featured-tag-text', '#ffffff');
      root.style.setProperty('--featured-secondary-button-bg', 'rgba(255, 255, 255, 0.2)');
      root.style.setProperty('--featured-secondary-button-text', '#ffffff');
      root.style.setProperty('--featured-secondary-button-border', 'rgba(255, 255, 255, 0.3)');
      root.style.setProperty('--featured-secondary-button-hover-bg', 'rgba(255, 255, 255, 0.3)');
      
      // Exercise Cards
      root.style.setProperty('--card-bg', '#f6f1e3'); // ap-10
      root.style.setProperty('--card-overlay', 'rgba(0, 0, 0, 0.8)');
      root.style.setProperty('--card-title', '#ffffff');
      root.style.setProperty('--card-description', '#ffffff');
      root.style.setProperty('--play-icon-bg', 'rgba(0, 0, 0, 0.5)');
      root.style.setProperty('--play-icon-text', '#ffffff');
      
      // Carousel
      root.style.setProperty('--carousel-arrow-bg', 'rgba(53, 56, 57, 0.9)');
      root.style.setProperty('--carousel-arrow-hover-bg', '#353839');
      root.style.setProperty('--carousel-arrow-text', '#ffffff');
      root.style.setProperty('--carousel-fade', 'rgba(0, 0, 0, 0.42)');
      
      // Section Headers
      root.style.setProperty('--section-title', '#353839'); // onyx-90
      root.style.setProperty('--section-subtitle', '#55595b'); // onyx-80
      root.style.setProperty('--section-accent', '#353839'); // onyx-90
      
      // Exercise Detail Tags (Light Mode)
      root.style.setProperty('--tag-bg', '#f3f3f4'); // onxy-20
      root.style.setProperty('--tag-text', '#353839'); // dark text

      // Video Player Controls (Light)
      root.style.setProperty('--vp-bg', '#011500');
      root.style.setProperty('--vp-border', '#ccc19e');
      root.style.setProperty('--vp-dropdown-bg', '#c0c9cc');
      root.style.setProperty('--vp-dropdown-border', '#353839');
      root.style.setProperty('--vp-dropdown-label', '#181a1a');
      root.style.setProperty('--vp-dropdown-item-bg', '#c0c9cc');
      root.style.setProperty('--vp-dropdown-item-hover-bg', '#353839');
      root.style.setProperty('--vp-dropdown-item-text', '#353839');
      root.style.setProperty('--vp-button-bg', '#c0c9cc');
      root.style.setProperty('--vp-button-hover-bg', '#DAE4E7');
      root.style.setProperty('--vp-button-text', '#181a1a');
      root.style.setProperty('--vp-button-border', '#181a1a');
      root.style.setProperty('--vp-slider-bg', '#353839');
      root.style.setProperty('--vp-slider-thumb', '#F6F1E3');
      root.style.setProperty('--vp-slider-active', '#60a5fa');
      root.style.setProperty('--vp-dropdown-item-hover-bg', '#f3f4f6');
      root.style.setProperty('--vp-dropdown-chevron', '#353839');
      root.style.setProperty('--vp-label', '#181a1a');
      root.style.setProperty('--vp-focus-bg', '#f6f1e3');
      root.style.setProperty('--vp-focus-text', '#353839');
      // Video Player Tabs (Light)
      root.style.setProperty('--vp-tab-active', '#353839');
      root.style.setProperty('--vp-tab-inactive', '#55595b');
      // Video Player Tab Borders & Backgrounds (Light)
      root.style.setProperty('--vp-tab-border-active', 'transparent');
      root.style.setProperty('--vp-tab-border-inactive', 'transparent');
      root.style.setProperty('--vp-tab-bg-active', '#F3F4F5');
      root.style.setProperty('--vp-tab-bg-inactive', 'transparent');
      // Dropdown label and chevron (Light)
      root.style.setProperty('--vp-dropdown-label', '#353839');
      root.style.setProperty('--vp-dropdown-chevron', '#353839');
      root.style.setProperty('--vp-panel-bg', '#c0c9cc');
      root.style.setProperty('--vp-panel-shadow', '0 4px 24px 0 rgba(0,0,0,0.10)');
      root.style.setProperty('--vp-panel-title', '#353839');
      root.style.setProperty('--vp-panel-border', '#c0c9cc');
      root.style.setProperty('--vp-panel-divider', '#e5e7eb');
      root.style.setProperty('--vp-panel-icon-bg', '#F3F4F5');
      root.style.setProperty('--vp-panel-icon-active-bg', '#c0c9cc');
      root.style.setProperty('--vp-panel-icon', '#353839');
      root.style.setProperty('--vp-panel-icon-active', '#fff');
      root.style.setProperty('--vp-panel-icon-border', '#c0c9cc');
      
      // Accordion (Light Mode)
      root.style.setProperty('--accordion-bg', '#c0c9cc'); // white
      root.style.setProperty('--accordion-border', '#e5e7eb'); // gray-200
      root.style.setProperty('--accordion-hover-bg', '#eef0f1'); // gray-50
      root.style.setProperty('--accordion-text', '#353839'); // onyx-90
      root.style.setProperty('--accordion-chevron', '#353839'); // gray-500
      root.style.setProperty('--accordion-shadow', '0 0px 0px 0 rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--accordion-shadow-hover', '0 4px 6px -1px rgba(0, 0, 0, 0.1)');
      // Tooltip (Light Mode)
      root.style.setProperty('--tooltip-bg', '#f3f3f4'); // light background
      root.style.setProperty('--tooltip-text', '#353839'); // dark text
      root.style.setProperty('--tooltip-border', '#c0c9cc'); // subtle border
      root.style.setProperty('--tooltip-shadow', '0 4px 24px 0 rgba(0,0,0,0.10)');
      // Results Page Tabs (Light)
      root.style.setProperty('--results-tab-bg-active', '#F3F4F5');
      root.style.setProperty('--results-tab-bg-inactive', 'transparent');
      root.style.setProperty('--results-tab-text-active', '#353839');
      root.style.setProperty('--results-tab-text-inactive', '#353839');
      root.style.setProperty('--results-tab-border-active', 'transparent');
      root.style.setProperty('--results-tab-border-inactive', 'transparent');
      root.style.setProperty('--results-tab-hover-bg', 'transparent');
      root.style.setProperty('--results-tab-hover-text', '#353839');
      root.style.setProperty('--results-tab-hover-border', '#f3f3f4');
      root.style.setProperty('--results-tabs-border-color', '#e5e7eb');
      // Results Page Summary Card (Light)
      root.style.setProperty('--results-summary-bg', '#c0c9cc');
      root.style.setProperty('--results-summary-border', '#e5e7eb');
      root.style.setProperty('--results-summary-title', '#353839');
      root.style.setProperty('--results-summary-info-bg', '#DAE4E7');
      root.style.setProperty('--results-summary-info-text', '#353839');
      root.style.setProperty('--results-summary-shadow', '0 2px 12px 0 rgba(0,0,0,0.08)');
      // Results Page Info Icon (Light)
      root.style.setProperty('--results-info-icon', '#55595b');
      root.style.setProperty('--results-info-icon-hover', '#1D4ED8');
      // Results Page Chart Internals (Light)
      root.style.setProperty('--results-chart-bg', '#c0c9cc');
      root.style.setProperty('--results-chart-axis', '#353839');
      root.style.setProperty('--results-chart-grid', '#777d7f');
      root.style.setProperty('--results-chart-tooltip-bg', '#c0c9cc');
      root.style.setProperty('--results-chart-tooltip-text', '#353839');
      root.style.setProperty('--results-chart-legend', '#55595b');
      root.style.setProperty('--results-chart-cursor', '#1D4ED8');
      // Results Page Chart Series Colors (Light)
      root.style.setProperty('--results-chart-series-1', '#2563EB');
      root.style.setProperty('--results-chart-series-2', '#06B6D4');
      root.style.setProperty('--results-chart-series-3', '#F59E42');
      root.style.setProperty('--results-chart-series-4', '#F97316');
      root.style.setProperty('--results-chart-series-5', '#8B5CF6');
      root.style.setProperty('--results-chart-series-6', '#EC4899');
      root.style.setProperty('--results-chart-series-7', '#10B981');
      root.style.setProperty('--results-chart-series-8', '#EF4444');
      // Chart cursor, highlight, selection (Light)
      root.style.setProperty('--results-chart-highlight', '#F59E42');
      root.style.setProperty('--results-chart-selection', '#06B6D4');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 