import { useRef, useEffect } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip } from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

const AI_COLORS = {
  gpt: '#10b981', claude: '#f97316', deepseek: '#3b82f6', grok: '#a855f7'
}

const AI_LOGOS = {
  gpt: '/gpt.jpg',
  claude: '/claude.png',
  deepseek: '/deep.webp',
  grok: '/grok.jpg'
}

export default function PnLChart({ aiData, positions = [] }) {
  const chartRef = useRef(null)

  if (!aiData || aiData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-dark-grey">
        <div className="text-center text-gray-600">
          <div className="mb-2 animate-pulse text-skin">████████████</div>
          <div className="text-sm font-mono text-gray-500">Loading Chart Data...</div>
        </div>
      </div>
    )
  }

  const now = new Date()
  const labels = Array.from({ length: 24 }, (_, i) => {
    const date = new Date(now - (23 - i) * 3600000)
    const month = date.toLocaleString('en', { month: 'short' })
    const day = date.getDate()
    const hours = date.getHours().toString().padStart(2, '0')
    const mins = date.getMinutes().toString().padStart(2, '0')
    return `${month} ${day} ${hours}:${mins}`
  })

  let globalMin = Infinity, globalMax = -Infinity
  aiData.forEach(ai => {
    const history = ai.pnl_history || Array(24).fill(ai.initial_balance || 500)
    const min = Math.min(...history)
    const max = Math.max(...history)
    if (min < globalMin) globalMin = min
    if (max > globalMax) globalMax = max
  })

  const range = globalMax - globalMin
  const yMin = Math.max(0, Math.floor((globalMin - range * 0.1) / 100) * 100)
  const yMax = Math.ceil((globalMax + range * 0.1) / 100) * 100

  const datasets = aiData.filter(ai => ai.id !== 'gemini').map(ai => ({
    label: ai.name,
    data: ai.pnl_history || Array(24).fill(ai.initial_balance || 500),
    borderColor: AI_COLORS[ai.id] || AI_COLORS.gpt,
    backgroundColor: 'transparent',
    borderWidth: 2.5,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: AI_COLORS[ai.id] || AI_COLORS.gpt,
    pointHoverBorderColor: '#000',
    pointHoverBorderWidth: 2,
    tension: 0.3,
    fill: false
  }))

  const endpointLabelsPlugin = {
    id: 'endpointLabels',
    afterDatasetsDraw: (chart) => {
      const ctx = chart.ctx
      chart.data.datasets.forEach((dataset, i) => {
        const meta = chart.getDatasetMeta(i)
        const lastPoint = meta.data[meta.data.length - 1]
        if (!lastPoint) return

        const ai = aiData.filter(a => a.id !== 'gemini')[i]
        if (!ai) return

        const x = lastPoint.x, y = lastPoint.y
        const color = AI_COLORS[ai.id] || AI_COLORS.gpt
        // Get balance from pnl_history (same as what the line shows)
        const pnlHistory = ai.pnl_history || Array(24).fill(500)
        const balance = pnlHistory[pnlHistory.length - 1]

        // Circular avatar with logo image
        const img = new Image()
        img.src = AI_LOGOS[ai.id]

        ctx.save()
        // Clip to circle
        ctx.beginPath()
        ctx.arc(x, y, 14, 0, Math.PI * 2)
        ctx.clip()

        // Draw image - zoom in slightly (1.2x) to hide background edges
        const zoom = 1.2
        const size = 28 * zoom
        const offset = (size - 28) / 2
        ctx.drawImage(img, x - 14 - offset, y - 14 - offset, size, size)
        ctx.restore()

        // Draw colored ring
        ctx.save()
        ctx.beginPath()
        ctx.arc(x, y, 14, 0, Math.PI * 2)
        ctx.lineWidth = 3
        ctx.strokeStyle = color
        ctx.stroke()
        ctx.restore()

        // Balance label box
        const labelText = `$${balance.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
        ctx.save()
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif'
        const textWidth = ctx.measureText(labelText).width
        const boxWidth = textWidth + 10
        const boxHeight = 18
        const boxX = x + 22
        const boxY = y - boxHeight / 2

        // Hard corner box
        ctx.fillStyle = color
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight)
        ctx.fillStyle = '#000'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(labelText, boxX + 5, y)
        ctx.restore()
      })
    }
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(75, 85, 99, 0.15)', drawBorder: false, lineWidth: 0.5 },
        ticks: { color: '#6b7280', font: { size: 9, family: 'monospace' }, maxRotation: 0, maxTicksLimit: 8 }
      },
      y: {
        min: yMin,
        max: yMax,
        grid: { color: 'rgba(75, 85, 99, 0.15)', drawBorder: false, lineWidth: 0.5 },
        ticks: {
          color: '#6b7280',
          font: { size: 10, family: 'monospace' },
          callback: (v) => {
            if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'k'
            return '$' + v.toFixed(0)
          }
        }
      }
    },
    layout: { padding: { top: 20, right: 140, bottom: 10, left: 10 } }
  }

  const filteredAIs = aiData.filter(ai => ai.id !== 'gemini')

  return (
    <div className="h-full w-full flex flex-col bg-dark-grey">
      <div className="flex-1 min-h-0 max-h-[calc(100%-120px)] overflow-hidden">
        <Line ref={chartRef} data={{ labels, datasets }} options={options} plugins={[endpointLabelsPlugin]} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-t border-gray-800 flex-shrink-0 overflow-visible">
        {filteredAIs.map(ai => {
          const color = AI_COLORS[ai.id]
          const logoSrc = AI_LOGOS[ai.id]

          // Calculate total account value (balance + unrealized P&L from positions)
          const balance = ai.balance || 0
          const aiPositions = positions.filter(p => p.ai_id === ai.id)
          const unrealizedPnL = aiPositions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0)
          const totalValue = balance + unrealizedPnL

          // Calculate P&L from starting balance
          const pnl = ((totalValue - 500) / 500) * 100

          return (
            <div key={ai.id} className="border-r border-gray-800 last:border-r-0 p-1.5 text-center bg-dark-grey hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 mx-auto mb-1 overflow-hidden border-2 flex items-center justify-center" style={{ borderColor: ai.id === 'grok' ? '#000' : color, clipPath: 'circle(50%)' }}>
                <img src={logoSrc} alt={ai.name || ai.id} className="object-cover" style={{ width: '120%', height: '120%' }} />
              </div>
              <div className="text-[11px] font-bold mb-0.5 text-skin">{ai.name?.toUpperCase() || ai.id?.toUpperCase() || 'UNKNOWN'}</div>
              <div className="font-mono text-[9px] text-gray-500">Cash: ${balance.toFixed(2)}</div>
              <div className="font-mono text-[11px] font-semibold text-gray-300">${totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
              <div className={`font-mono text-[11px] ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
              </div>
              {unrealizedPnL !== 0 && (
                <div className={`font-mono text-[8px] ${unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)} unreal
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
