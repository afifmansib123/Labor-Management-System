'use client'

import * as React from 'react'
import { Clock } from 'lucide-react'

interface TimePickerProps {
  value?: string
  onChange?: (time: string) => void
  placeholder?: string
  className?: string
  step?: number
}

export function TimePicker({
  value = '',
  onChange,
  placeholder = 'Select time',
  className = '',
  step = 15,
}: TimePickerProps) {
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

  const generateTimeSlots = () => {
    const slots: string[] = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += step) {
        const h = hour.toString().padStart(2, '0')
        const m = minute.toString().padStart(2, '0')
        slots.push(`${h}:${m}`)
      }
    }
    return slots
  }

  const formatTime = (time: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const timeSlots = generateTimeSlots()

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          readOnly
          value={value ? formatTime(value) : ''}
          onClick={() => setIsOpen(!isOpen)}
          placeholder={placeholder}
          className={`w-full h-10 px-3 py-2 pr-10 text-sm rounded-md border border-input bg-background
            cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}
        />
        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto bg-background border rounded-md shadow-lg">
          {timeSlots.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => {
                onChange?.(slot)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors
                ${slot === value ? 'bg-primary text-primary-foreground' : ''}`}
            >
              {formatTime(slot)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
