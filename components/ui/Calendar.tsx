'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

interface CalendarProps {
  value?: Date
  onChange?: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  highlightedDates?: { date: Date; color?: string; count?: number }[]
  onMonthChange?: (month: number, year: number) => void
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function Calendar({
  value,
  onChange,
  minDate,
  maxDate,
  highlightedDates = [],
  onMonthChange,
}: CalendarProps) {
  const [viewDate, setViewDate] = React.useState(value || new Date())

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const prevMonth = () => {
    const newDate = new Date(year, month - 1, 1)
    setViewDate(newDate)
    onMonthChange?.(newDate.getMonth(), newDate.getFullYear())
  }

  const nextMonth = () => {
    const newDate = new Date(year, month + 1, 1)
    setViewDate(newDate)
    onMonthChange?.(newDate.getMonth(), newDate.getFullYear())
  }

  const isSelected = (day: number) => {
    if (!value) return false
    return (
      value.getDate() === day &&
      value.getMonth() === month &&
      value.getFullYear() === year
    )
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    )
  }

  const isDisabled = (day: number) => {
    const date = new Date(year, month, day)
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  const getHighlight = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return highlightedDates.find((h) => {
      const hDateStr = h.date instanceof Date
        ? `${h.date.getFullYear()}-${String(h.date.getMonth() + 1).padStart(2, '0')}-${String(h.date.getDate()).padStart(2, '0')}`
        : ''
      return hDateStr === dateStr
    })
  }

  const handleDateClick = (day: number) => {
    if (isDisabled(day)) return
    const newDate = new Date(year, month, day)
    onChange?.(newDate)
  }

  const days: React.ReactNode[] = []

  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="h-10" />)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const highlight = getHighlight(day)
    const selected = isSelected(day)
    const today = isToday(day)
    const disabled = isDisabled(day)

    days.push(
      <button
        key={day}
        type="button"
        onClick={() => handleDateClick(day)}
        disabled={disabled}
        className={`relative h-10 w-10 rounded-md text-sm transition-colors
          ${selected ? 'bg-primary text-primary-foreground' : ''}
          ${!selected && today ? 'border border-primary' : ''}
          ${!selected && !disabled ? 'hover:bg-accent' : ''}
          ${disabled ? 'text-muted-foreground cursor-not-allowed' : ''}
          ${highlight && !selected ? 'font-bold' : ''}
        `}
      >
        {day}
        {highlight && (
          <span
            className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
              highlight.color || 'bg-primary'
            }`}
          />
        )}
        {highlight?.count && highlight.count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] rounded-full bg-destructive text-white flex items-center justify-center">
            {highlight.count > 9 ? '9+' : highlight.count}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="p-3 bg-background border rounded-lg shadow-sm w-fit">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">
          {MONTHS[month]} {year}
        </span>
        <Button variant="ghost" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map((day) => (
          <div
            key={day}
            className="h-10 w-10 flex items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">{days}</div>
    </div>
  )
}

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date) => void
  placeholder?: string
  minDate?: Date
  maxDate?: Date
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  minDate,
  maxDate,
  className = '',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 px-3 py-2 text-sm text-left rounded-md border border-input bg-background
          focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}
      >
        {value ? formatDate(value) : <span className="text-muted-foreground">{placeholder}</span>}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1">
          <Calendar
            value={value}
            onChange={(date) => {
              onChange?.(date)
              setIsOpen(false)
            }}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>
      )}
    </div>
  )
}
