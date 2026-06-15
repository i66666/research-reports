import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FullSlug } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import style from "./styles/calendar.scss"
import { JSX } from "preact"
import { useState } from "preact/hooks"

interface Options {
  title: string
}

const defaultOptions: Options = {
  title: "📅 日期",
}

function getDateFromSlug(slug: FullSlug): string | null {
  const match = slug.match(/^(\d{4}-\d{2}-\d{2})\//)
  return match ? match[1] : null
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"]

export default ((userOpts?: Partial<Options>) => {
  const opts = { ...defaultOptions, ...userOpts }

  function Calendar(props: QuartzComponentProps) {
    const { allFiles, fileData } = props

    const contentDates = new Set<string>()
    for (const file of allFiles) {
      const date = getDateFromSlug(file.slug!)
      if (date) contentDates.add(date)
    }
    const sortedDates = Array.from(contentDates).sort()

    const now = new Date()
    const [currentYear, setCurrentYear] = useState(now.getFullYear())
    const [currentMonth, setCurrentMonth] = useState(now.getMonth())

    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

    // Build calendar rows (weeks)
    const rows: JSX.Element[] = []
    let cells: JSX.Element[] = []

    // Empty cells for first week
    for (let i = 0; i < firstDay; i++) {
      cells.push(<td class="cal-cell cal-empty"></td>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const hasContent = contentDates.has(dateStr)
      const isToday = dateStr === `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

      let cellClass = "cal-cell"
      if (hasContent) cellClass += " cal-has"
      if (isToday) cellClass += " cal-today"

      if (hasContent) {
        const href = `/research-reports/#date-${dateStr}`
        cells.push(
          <td class={cellClass}>
            <a href={href} class="cal-link" onClick={(e) => { e.preventDefault(); window.location.href = href; }}>{day}</a>
          </td>
        )
      } else {
        cells.push(
          <td class={cellClass}>
            <span class="cal-num">{day}</span>
          </td>
        )
      }

      // End of week: push row
      if (cells.length === 7) {
        rows.push(<tr>{...cells}</tr>)
        cells = []
      }
    }

    // Last row: pad remaining cells
    if (cells.length > 0) {
      while (cells.length < 7) {
        cells.push(<td class="cal-cell cal-empty"></td>)
      }
      rows.push(<tr>{...cells}</tr>)
    }

    const prevMonth = () => {
      if (currentMonth === 0) { setCurrentYear(currentYear - 1); setCurrentMonth(11) }
      else { setCurrentMonth(currentMonth - 1) }
    }
    const nextMonth = () => {
      if (currentMonth === 11) { setCurrentYear(currentYear + 1); setCurrentMonth(0) }
      else { setCurrentMonth(currentMonth + 1) }
    }

    return (
      <div class="calendar-widget">
        <h3>{opts.title}</h3>
        <div class="calendar-nav">
          <button onClick={prevMonth} class="cal-nav-btn" aria-label="上一月">◀</button>
          <span class="cal-month-label">{currentYear}年 {MONTHS[currentMonth]}</span>
          <button onClick={nextMonth} class="cal-nav-btn" aria-label="下一月">▶</button>
        </div>
        <table class="calendar-table">
          <thead>
            <tr>
              {WEEKDAYS.map(d => <th class="cal-th">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>
        {sortedDates.length > 0 && (
          <div class="calendar-count">共 {sortedDates.length} 天有研报</div>
        )}
      </div>
    )
  }

  Calendar.css = style
  return Calendar
}) satisfies QuartzComponentConstructor
