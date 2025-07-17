/**
 * Interactive Charts for Enhanced Sentiment Analysis
 * Implements visual analytics using Chart.js
 */

class InteractiveCharts {
  constructor() {
    this.chartInstances = new Map();
    this.chartColors = {
      positive: '#10b981',
      neutral: '#6b7280',
      negative: '#ef4444',
      primary: '#667eea',
      secondary: '#f59e0b',
      accent: '#8b5cf6'
    };
  }

  /**
   * Initialize Chart.js if not already loaded
   */
  async initializeChartJS() {
    if (typeof window.Chart !== 'undefined') return;

    // Load Chart.js dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
    
    const chartjsPromise = new Promise((resolve) => {
      script.onload = () => {
        // Configure Chart.js defaults
        if (window.Chart) {
          window.Chart.defaults.font.family = 'system-ui, -apple-system, sans-serif';
          window.Chart.defaults.font.size = 12;
          window.Chart.defaults.plugins.legend.display = true;
          window.Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          window.Chart.defaults.plugins.tooltip.cornerRadius = 8;
          window.Chart.defaults.plugins.tooltip.titleColor = '#fff';
          window.Chart.defaults.plugins.tooltip.bodyColor = '#fff';
          window.Chart.defaults.responsive = true;
          window.Chart.defaults.maintainAspectRatio = false;
        }
        resolve();
      };
    });
    
    document.head.appendChild(script);
    return chartjsPromise;
  }

  /**
   * Create sentiment wheel chart
   */
  createSentimentWheel(elementId, data) {
    // Destroy existing chart if it exists
    this.destroyChart(elementId);
    
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) return;

    const sentiment = data.overall_sentiment;
    const chartData = {
      labels: ['Positive', 'Neutral', 'Negative'],
      datasets: [{
        data: [sentiment.positive, sentiment.neutral, sentiment.negative],
        backgroundColor: [
          this.chartColors.positive,
          this.chartColors.neutral,
          this.chartColors.negative
        ],
        borderWidth: 0,
        cutout: '60%'
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${value}%`;
            }
          }
        }
      },
      elements: {
        arc: {
          borderWidth: 2,
          borderColor: '#fff'
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1000
      }
    };

    const chart = new window.Chart(ctx, {
      type: 'doughnut',
      data: chartData,
      options: options
    });

    this.chartInstances.set(elementId, chart);
    return chart;
  }

  /**
   * Create sentiment by depth chart
   */
  createSentimentDepthChart(elementId, data) {
    // Destroy existing chart if it exists
    this.destroyChart(elementId);
    
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx || !data.sentiment_by_depth.length) return;

    const depthData = data.sentiment_by_depth;
    const labels = depthData.map(d => `Level ${d.depth}`);
    
    const chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Positive',
          data: depthData.map(d => d.positive),
          backgroundColor: this.chartColors.positive,
          borderColor: this.chartColors.positive,
          borderWidth: 2,
          fill: false
        },
        {
          label: 'Neutral',
          data: depthData.map(d => d.neutral),
          backgroundColor: this.chartColors.neutral,
          borderColor: this.chartColors.neutral,
          borderWidth: 2,
          fill: false
        },
        {
          label: 'Negative',
          data: depthData.map(d => d.negative),
          backgroundColor: this.chartColors.negative,
          borderColor: this.chartColors.negative,
          borderWidth: 2,
          fill: false
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value) => `${value}%`
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'center',
          labels: {
            boxWidth: 10,
            padding: 6,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y || 0;
              return `${label}: ${value}%`;
            }
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuad'
      }
    };

    const chart = new window.Chart(ctx, {
      type: 'line',
      data: chartData,
      options: options
    });

    this.chartInstances.set(elementId, chart);
    return chart;
  }

  /**
   * Create sentiment over time chart
   */
  createSentimentTimeChart(elementId, data) {
    // Destroy existing chart if it exists
    this.destroyChart(elementId);
    
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx || !data.sentiment_over_time.length) return;

    const timeData = data.sentiment_over_time;
    const labels = timeData.map(t => new Date(t.timestamp).toLocaleDateString());
    
    const chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Positive',
          data: timeData.map(t => t.positive),
          backgroundColor: this.chartColors.positive + '20',
          borderColor: this.chartColors.positive,
          borderWidth: 3,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Neutral',
          data: timeData.map(t => t.neutral),
          backgroundColor: this.chartColors.neutral + '20',
          borderColor: this.chartColors.neutral,
          borderWidth: 3,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Negative',
          data: timeData.map(t => t.negative),
          backgroundColor: this.chartColors.negative + '20',
          borderColor: this.chartColors.negative,
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value) => `${value}%`
          }
        },
        x: {
          title: {
            display: true,
            text: 'Time'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y || 0;
              return `${label}: ${value}%`;
            },
            afterLabel: (context) => {
              const dataIndex = context.dataIndex;
              const timePoint = timeData[dataIndex];
              return `Context: ${timePoint.event_context}`;
            }
          }
        }
      },
      animation: {
        duration: 1500,
        easing: 'easeInOutQuad'
      }
    };

    const chart = new window.Chart(ctx, {
      type: 'line',
      data: chartData,
      options: options
    });

    this.chartInstances.set(elementId, chart);
    return chart;
  }

  /**
   * Create raw sentiment distribution chart
   */
  createRawDistributionChart(elementId, data) {
    // Destroy existing chart if it exists
    this.destroyChart(elementId);
    
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) return;

    const rawDist = data.overall_sentiment.raw_distribution;
    const labels = Object.keys(rawDist).map(score => {
      const scoreMap = {
        '-2': 'Very Negative',
        '-1': 'Negative',
        '0': 'Neutral',
        '1': 'Positive',
        '2': 'Very Positive'
      };
      return scoreMap[score] || score;
    });
    
    const chartData = {
      labels: labels,
      datasets: [{
        label: 'Comment Count',
        data: Object.values(rawDist),
        backgroundColor: [
          '#dc2626',
          '#ef4444',
          '#6b7280',
          '#10b981',
          '#059669'
        ],
        borderColor: '#fff',
        borderWidth: 2
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed.y || 0;
              return `${value} comments`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Comments'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuad'
      }
    };

    const chart = new window.Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: options
    });

    this.chartInstances.set(elementId, chart);
    return chart;
  }

  /**
   * Create age distribution chart
   */
  createAgeDistributionChart(elementId, data) {
    // Destroy existing chart if it exists
    this.destroyChart(elementId);
    
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) return;

    const demographics = data.demographic_insights;
    const ageGroups = demographics.age_groups;
    
    const chartData = {
      labels: Object.keys(ageGroups).map(group => {
        const groupMap = {
          'gen_z': 'Gen Z',
          'millennials': 'Millennials',
          'gen_x': 'Gen X',
          'boomers': 'Boomers'
        };
        return groupMap[group] || group;
      }),
      datasets: [{
        data: Object.values(ageGroups),
        backgroundColor: [
          '#8b5cf6',
          '#06b6d4',
          '#10b981',
          '#f59e0b'
        ],
        borderWidth: 0
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${value}%`;
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1000
      }
    };

    const chart = new window.Chart(ctx, {
      type: 'pie',
      data: chartData,
      options: options
    });

    this.chartInstances.set(elementId, chart);
    return chart;
  }

  /**
   * Create gender distribution chart
   */
  createGenderDistributionChart(elementId, data) {
    // Destroy existing chart if it exists
    this.destroyChart(elementId);
    
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) return;

    const demographics = data.demographic_insights;
    const genderDist = demographics.gender_distribution;
    
    const chartData = {
      labels: Object.keys(genderDist).map(gender => 
        gender.charAt(0).toUpperCase() + gender.slice(1)
      ),
      datasets: [{
        data: Object.values(genderDist),
        backgroundColor: [
          '#3b82f6',
          '#ec4899',
          '#10b981'
        ],
        borderWidth: 0
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${value}%`;
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1000
      }
    };

    const chart = new window.Chart(ctx, {
      type: 'doughnut',
      data: chartData,
      options: options
    });

    this.chartInstances.set(elementId, chart);
    return chart;
  }

  /**
   * Create depth distribution chart
   */
  createDepthDistributionChart(elementId, data) {
    // Destroy existing chart if it exists
    this.destroyChart(elementId);
    
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) return;

    const depthData = data.reply_chain_depth_breakdown.depth_distribution;
    const labels = Object.keys(depthData).map(depth => `Depth ${depth}`);
    const commentCounts = Object.values(depthData).map(d => d.comment_count);
    
    const chartData = {
      labels: labels,
      datasets: [{
        label: 'Comments',
        data: commentCounts,
        backgroundColor: this.chartColors.primary,
        borderColor: this.chartColors.primary,
        borderWidth: 2
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed.y || 0;
              return `${value} comments`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Comments'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Reply Depth'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuad'
      }
    };

    const chart = new window.Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: options
    });

    this.chartInstances.set(elementId, chart);
    return chart;
  }

  /**
   * Create language distribution chart
   */
  createLanguageDistributionChart(elementId, data) {
    // Destroy existing chart if it exists
    this.destroyChart(elementId);
    
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) return;

    const langDist = data.language_analysis.language_distribution;
    
    const chartData = {
      labels: Object.keys(langDist),
      datasets: [{
        data: Object.values(langDist),
        backgroundColor: [
          '#667eea',
          '#764ba2',
          '#f093fb',
          '#f5576c',
          '#4facfe'
        ],
        borderWidth: 0
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${value}%`;
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1000
      }
    };

    const chart = new window.Chart(ctx, {
      type: 'pie',
      data: chartData,
      options: options
    });

    this.chartInstances.set(elementId, chart);
    return chart;
  }

  /**
   * Create feedback trends chart
   */
  createFeedbackTrendsChart(elementId, data) {
    // Destroy existing chart if it exists
    this.destroyChart(elementId);
    
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) return;

    const feedbackStats = data.user_feedback_stats;
    const trends = feedbackStats.feedback_trends;
    
    const chartData = {
      labels: ['Last 7 Days', 'Last 30 Days', 'Last 90 Days'],
      datasets: [
        {
          label: 'Total Feedback',
          data: [
            trends.last_7_days.total,
            trends.last_30_days.total,
            trends.last_90_days.total
          ],
          backgroundColor: this.chartColors.primary,
          borderColor: this.chartColors.primary,
          borderWidth: 2
        },
        {
          label: 'Disputed',
          data: [
            trends.last_7_days.disputed,
            trends.last_30_days.disputed,
            trends.last_90_days.disputed
          ],
          backgroundColor: this.chartColors.negative,
          borderColor: this.chartColors.negative,
          borderWidth: 2
        },
        {
          label: 'Accepted',
          data: [
            trends.last_7_days.accepted,
            trends.last_30_days.accepted,
            trends.last_90_days.accepted
          ],
          backgroundColor: this.chartColors.positive,
          borderColor: this.chartColors.positive,
          borderWidth: 2
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y || 0;
              return `${label}: ${value}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Feedback Count'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuad'
      }
    };

    const chart = new window.Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: options
    });

    this.chartInstances.set(elementId, chart);
    return chart;
  }

  /**
   * Create theme sentiment distribution chart
   */
  createThemeSentimentChart(elementId, themes) {
    // Destroy existing chart if it exists
    this.destroyChart(elementId);
    
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx || !themes.length) return;

    const themeNames = themes.slice(0, 5).map(theme => theme.theme);
    const sentimentData = themes.slice(0, 5).map(theme => {
      const sentimentMap = {
        'positive': 1,
        'neutral': 0,
        'negative': -1
      };
      return sentimentMap[theme.sentiment] || 0;
    });
    
    const chartData = {
      labels: themeNames,
      datasets: [{
        label: 'Sentiment Score',
        data: sentimentData,
        backgroundColor: sentimentData.map(score => {
          if (score > 0) return this.chartColors.positive;
          if (score < 0) return this.chartColors.negative;
          return this.chartColors.neutral;
        }),
        borderColor: '#fff',
        borderWidth: 2
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const score = context.parsed.y;
              const sentiment = score > 0 ? 'Positive' : score < 0 ? 'Negative' : 'Neutral';
              return sentiment;
            }
          }
        }
      },
      scales: {
        y: {
          min: -1,
          max: 1,
          ticks: {
            callback: (value) => {
              if (value === 1) return 'Positive';
              if (value === 0) return 'Neutral';
              if (value === -1) return 'Negative';
              return '';
            }
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuad'
      }
    };

    const chart = new window.Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: options
    });

    this.chartInstances.set(elementId, chart);
    return chart;
  }

  /**
   * Create interactive sparkline chart
   */
  createSparkline(elementId, data, type = 'line') {
    // Destroy existing chart if it exists
    this.destroyChart(elementId);
    
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) return;

    const chartData = {
      labels: data.labels || [],
      datasets: [{
        data: data.values || [],
        backgroundColor: data.color || this.chartColors.primary,
        borderColor: data.color || this.chartColors.primary,
        borderWidth: 2,
        fill: type === 'area',
        tension: 0.4
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: false
        }
      },
      scales: {
        x: {
          display: false
        },
        y: {
          display: false
        }
      },
      elements: {
        point: {
          radius: 0,
          hoverRadius: 4
        }
      },
      animation: {
        duration: 800,
        easing: 'easeInOutQuad'
      }
    };

    const chart = new window.Chart(ctx, {
      type: 'line',
      data: chartData,
      options: options
    });

    this.chartInstances.set(elementId, chart);
    return chart;
  }

  /**
   * Update chart data
   */
  updateChart(elementId, newData) {
    const chart = this.chartInstances.get(elementId);
    if (!chart) return;

    chart.data = newData;
    chart.update('active');
  }

  /**
   * Destroy chart instance
   */
  destroyChart(elementId) {
    const chart = this.chartInstances.get(elementId);
    if (chart) {
      chart.destroy();
      this.chartInstances.delete(elementId);
    }
  }

  /**
   * Destroy all chart instances
   */
  destroyAllCharts() {
    this.chartInstances.forEach((chart, elementId) => {
      chart.destroy();
    });
    this.chartInstances.clear();
  }

  /**
   * Resize all charts
   */
  resizeAllCharts() {
    this.chartInstances.forEach((chart) => {
      chart.resize();
    });
  }

  /**
   * Get chart instance by element ID
   */
  getChart(elementId) {
    return this.chartInstances.get(elementId);
  }

  /**
   * Check if chart exists
   */
  hasChart(elementId) {
    return this.chartInstances.has(elementId);
  }

  /**
   * Export chart as image
   */
  exportChart(elementId, filename = 'chart.png') {
    const chart = this.chartInstances.get(elementId);
    if (!chart) return;

    const link = document.createElement('a');
    link.download = filename;
    link.href = chart.toBase64Image();
    link.click();
  }

  /**
   * Get chart statistics
   */
  getChartStats() {
    return {
      totalCharts: this.chartInstances.size,
      chartTypes: [...this.chartInstances.values()].map(chart => chart.config.type),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage (approximate)
   */
  estimateMemoryUsage() {
    const chartCount = this.chartInstances.size;
    const avgChartSize = 50; // KB estimate per chart
    return `${(chartCount * avgChartSize).toFixed(0)} KB`;
  }
}

// Initialize global charts instance
window.interactiveCharts = new InteractiveCharts();

// Auto-initialize Chart.js when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  await window.interactiveCharts.initializeChartJS();
  console.log('Interactive Charts initialized');
});

// Handle window resize
window.addEventListener('resize', () => {
  window.interactiveCharts.resizeAllCharts();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InteractiveCharts;
}