'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Upload, MapPin } from 'lucide-react'

interface MapUploaderProps {
  onMapSelect: (file: File, preview: string) => void
}

export default function MapUploader({ onMapSelect }: MapUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [mapPoints, setMapPoints] = useState<{ lat: number; lng: number }[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleMapUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string
      setPreview(imageUrl)
      onMapSelect(file, imageUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !preview) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Convert pixel coordinates to approximate lat/lng
    const lat = 23.8103 + (y / rect.height) * 0.1
    const lng = 90.4125 + (x / rect.width) * 0.1

    const newPoint = { lat: parseFloat(lat.toFixed(4)), lng: parseFloat(lng.toFixed(4)) }
    setMapPoints([...mapPoints, newPoint])

    // Draw marker on canvas
    const context = canvasRef.current.getContext('2d')
    if (context) {
      context.fillStyle = '#ef4444'
      context.beginPath()
      context.arc(x, y, 5, 0, 2 * Math.PI)
      context.fill()
    }
  }

  const clearPoints = () => {
    setMapPoints([])
    if (canvasRef.current && preview) {
      const context = canvasRef.current.getContext('2d')
      if (context) {
        const img = new Image()
        img.src = preview
        img.onload = () => {
          context.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
          context.drawImage(img, 0, 0)
        }
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Upload</CardTitle>
        <CardDescription>Upload Dhaka city map and mark route points</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="map-upload">Upload Map Image</Label>
          <input
            ref={fileInputRef}
            id="map-upload"
            type="file"
            accept="image/*"
            onChange={handleMapUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Select Map Image
          </Button>
        </div>

        {preview && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Click on map to mark route points</p>
            <canvas
              ref={canvasRef}
              width={400}
              height={300}
              className="border border-border rounded-lg cursor-crosshair bg-white"
              onClick={handleCanvasClick}
              onLoad={() => {
                const context = canvasRef.current?.getContext('2d')
                if (context) {
                  const img = new Image()
                  img.src = preview
                  img.onload = () => {
                    context.drawImage(img, 0, 0, 400, 300)
                  }
                }
              }}
            />
            {canvasRef.current === null && (
              <img
                src={preview}
                alt="Map"
                width={400}
                height={300}
                className="border border-border rounded-lg"
              />
            )}
          </div>
        )}

        {mapPoints.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">Selected Points ({mapPoints.length})</p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearPoints}
              >
                Clear Points
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto">
              {mapPoints.map((point, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-muted rounded text-xs flex items-center space-x-2"
                >
                  <MapPin className="w-3 h-3" />
                  <span>
                    {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
