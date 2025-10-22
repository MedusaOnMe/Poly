import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const AI_COLORS = {
  gpt: { line: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  claude: '#a855f7',
  deepseek: '#10b981',
  grok: '#f59e0b',
  gemini: '#ec4899'
}

export default function PnLChart({ aiData }) {
  if (!aiData || aiData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="loading-bar mb-2">████████████</div>
          <p>Loading chart data...</p>
        </div>
      </div>
    )
  }

  // Generate time labels for last 24h (every hour)
  const labels = Array.from({ length: 24 }, (_, i) => `${23 - i}h ago`)

  const datasets = aiData.map((ai) => {
    const color = AI_COLORS[ai.id] || '#6b7280'

    // Generate sample PnL history - in production this comes from Firebase
    const history = ai.pnl_history || Array.from({ length: 24 }, () =>
      500 + (Math.random() - 0.5) * 100
    )

    return {
      label: ai.name,
      data: history,
      borderColor: color,
      backgroundColor: typeof color === 'object' ? color.bg : `${color}20`,
      borderWidth: 2,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
    }
  })

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#e5e7eb',
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#16161f',
        titleColor: '#e5e7eb',
        bodyColor: '#e5e7eb',
        borderColor: '#2a2a35',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: '#2a2a35',
          drawBorder: false
        },
        ticks: {
          color: '#9ca3af',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8
        }
      },
      y: {
        grid: {
          color: '#2a2a35',
          drawBorder: false
        },
        ticks: {
          color: '#9ca3af',
          callback: (value) => `$${value}`
        },
        beginAtZero: false
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  }

  return (
    <div className="h-64">
      <Line data={{ labels, datasets }} options={options} />
    </div>
  )
}
