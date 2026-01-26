import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Cloudinary configuration missing' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { folder = 'labor-management', uploadPreset } = body

    const timestamp = Math.round(new Date().getTime() / 1000)

    const paramsToSign: Record<string, string | number> = {
      timestamp,
      folder,
    }

    if (uploadPreset) {
      paramsToSign.upload_preset = uploadPreset
    }

    const sortedParams = Object.keys(paramsToSign)
      .sort()
      .map((key) => `${key}=${paramsToSign[key]}`)
      .join('&')

    const signature = crypto
      .createHash('sha256')
      .update(sortedParams + apiSecret)
      .digest('hex')

    return NextResponse.json({
      signature,
      timestamp,
      cloudName,
      apiKey,
      folder,
    })
  } catch (error) {
    console.error('Error generating Cloudinary signature:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
