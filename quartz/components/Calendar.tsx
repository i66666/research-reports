import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FullSlug, resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import style from "./styles/calendar.scss"
import { JSX } from "preact"
import { useEffect, useState } from "preact/hooks"

interface Options {
  title: string
}

const defaultOptions: Options = {
  title: "📅 日期",
}

// Extract date from folder slug (YYYY-MM-DD pattern)
function getDateFromSlug(slug: FullSlug): string | null {
  const match = slug.match(/^(\d{4}-\d{2}-\d{2})\//)
  return match ? match[1] : null
}

// Get all days in a month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

// Get day of week for the 1st (0=Sun)
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"]

export default ((userOpts?: Partial<Options>) => {
  const opts = { ...defaultOptions, ...userOpts }

  function Calendar(props: QuartzComponentProps) {
    const { allFiles, fileData } = props

    // Collect all dates that have content
    const contentDates = new Set<string>()
    for (const file of allFiles) {
      const date = getDateFromSlug(file.slug!)
      if (date) contentDates.add(date)
    }

    // Sort dates to find range
    const sortedDates = Array.from(contentDates).sort()
    
    const now = new Date()
    const [currentYear, setCurrentYear] = useState(now.getFullYear())
    const [currentMonth, setCurrentMonth] = useState(now.getMonth())

    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
    
    // Build calendar grid
    const cells: JSX.Element[] = []
    
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div class="calendar-day empty" />)
    }
    
    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const hasContent = contentDates.has(dateStr)
      const isToday = dateStr === `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
      
      if (hasContent) {
        const href = resolveRelative(fileData.slug!, `${dateStr}/` as FullSlug)
        cells.push(
          <a href={href} class={`calendar-day has-content${isToday ? ' today' : ''}`}>
            <span class="day-num">{day}</span>
            <span class="day-dot">●</span>
          </a>
        )
      } else {
        cells.push(
          <div class={`calendar-day empty${isToday ? ' today' : ''}`}>
            <span class="day-num">{day}</span>
          </div>
        )
      }
    }

    const prevMonth = () => {
      if (currentMonth === 0) {
        setCurrentYear(currentYear - 1)
        setCurrentMonth(11)
      } else {
        setCurrentMonth(currentMonth - 1)
      }
    }
    
    const nextMonth = () => {
      if (currentMonth === 11) {
        setCurrentYear(currentYear + 1)
        setCurrentMonth(0)
      } else {
        setCurrentMonth(currentMonth + 1)
      }
    }

    return (
      <div class="calendar-widget">
        <h3>{opts.title}</h3>
        <div class="calendar-nav">
          <button onClick={prevMonth} class="cal-nav-btn" aria-label="上一月">◀</button>
          <span class="cal-month-label">{currentYear}年 {MONTHS[currentMonth]}</span>
          <button onClick={nextMonth} class="cal-nav-btn" aria-label="下一月">▶</button>
        </div>
        <div class="calendar-grid">
          {WEEKDAYS.map(d => <div class="calendar-weekday">{d}</div>)}
          {cells}
        </div>
        {sortedDates.length > 0 && (
          <div class="calendar-count">共 {sortedDates.length} 天有研报</div>
        )}
      </div>
    )
  }

  Calendar.css = style
  Calendar.beforeDOMLoaded = undefined
  Calendar.afterDOMLoaded = undefined
  return Calendar
}) satisfies QuartzComponentConstructor
