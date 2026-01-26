'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import MapUploader from '@/components/dashboard/MapUploader'
import { createRouteSchema } from '@/lib/utils/validation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function JobManagementPage() {
  const [tab, setTab] = useState('routes')
  const [mapData, setMapData] = useState<{ file: File; preview: string } | null>(null)
  const [selectedDays, setSelectedDays] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(createRouteSchema),
  })

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        ...data,
        operatingDays: selectedDays,
        mapImageUrl: mapData?.preview,
        mapCoordinates: [],
      }

      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        alert('Route created successfully!')
        reset()
        setSelectedDays([])
        setMapData(null)
      }
    } catch (error) {
      console.error('Error creating route:', error)
      alert('Failed to create route')
    }
  }

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Job Management</h1>
        <p className="text-muted-foreground">Manage routes and jobs for transportation</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="routes">Create Route</TabsTrigger>
          <TabsTrigger value="jobs">Create Job</TabsTrigger>
          <TabsTrigger value="list">View Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MapUploader onMapSelect={(file, preview) => setMapData({ file, preview })} />

            <Card>
              <CardHeader>
                <CardTitle>Route Details</CardTitle>
                <CardDescription>Create a new route</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Route Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Agartola to Mohammadpur"
                      {...register('name')}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name.message as string}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pointA">Start Point</Label>
                    <Input
                      id="pointA"
                      placeholder="e.g., Agartola"
                      {...register('pointA')}
                    />
                    {errors.pointA && (
                      <p className="text-xs text-destructive">{errors.pointA.message as string}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pointB">End Point</Label>
                    <Input
                      id="pointB"
                      placeholder="e.g., Mohammadpur"
                      {...register('pointB')}
                    />
                    {errors.pointB && (
                      <p className="text-xs text-destructive">{errors.pointB.message as string}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Operating Days</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {DAYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`p-2 rounded text-sm border transition-colors ${
                            selectedDays.includes(day)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border bg-background hover:bg-muted'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="start">Start Time</Label>
                      <Input
                        id="start"
                        type="time"
                        {...register('operatingHoursStart')}
                      />
                      {errors.operatingHoursStart && (
                        <p className="text-xs text-destructive">
                          {errors.operatingHoursStart.message as string}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end">End Time</Label>
                      <Input
                        id="end"
                        type="time"
                        {...register('operatingHoursEnd')}
                      />
                      {errors.operatingHoursEnd && (
                        <p className="text-xs text-destructive">
                          {errors.operatingHoursEnd.message as string}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    Create Route
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Create Job</CardTitle>
              <CardDescription>Schedule a job for a route</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Jobs List</CardTitle>
              <CardDescription>All scheduled jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
