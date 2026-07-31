import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import ffmpegStatic from 'ffmpeg-static'
import ffmpeg from 'fluent-ffmpeg'

function resolveFfmpegPath() {
  const candidates = [
    process.env.FFMPEG_PATH,
    typeof ffmpegStatic === 'string' ? ffmpegStatic : undefined,
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/opt/local/bin/ffmpeg',
    'ffmpeg',
  ]

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate
    }
  }

  return 'ffmpeg'
}

function resolveFfprobePath() {
  const candidates = [
    process.env.FFPROBE_PATH,
    typeof ffmpegStatic === 'string'
      ? ffmpegStatic.replace(/ffmpeg([\\/]|$)/, 'ffprobe$1')
      : undefined,
    '/opt/homebrew/bin/ffprobe',
    '/usr/local/bin/ffprobe',
    '/opt/local/bin/ffprobe',
    'ffprobe',
  ]

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate
    }
  }

  return 'ffprobe'
}

ffmpeg.setFfmpegPath(resolveFfmpegPath())
ffmpeg.setFfprobePath(resolveFfprobePath())

export interface OptimizedVideoResult {
  filePath: string
  mimeType: string
  size: number
}

function getTempDir() {
  return process.env.TMPDIR || os.tmpdir()
}

export async function optimizeVideo(inputPath: string): Promise<OptimizedVideoResult> {
  const tempDir = await fs.mkdtemp(path.join(getTempDir(), 'payload-video-'))
  const outputPath = path.join(tempDir, 'optimized.webm')

  await new Promise<void>((resolve, reject) => {
    const command = ffmpeg(inputPath)
      .outputOptions([
        '-vf',
        "scale='min(1280,iw)':-2:flags=lanczos",
        '-c:v',
        'libvpx-vp9',
        '-crf',
        '30',
        '-b:v',
        '0',
        '-pix_fmt',
        'yuv420p',
        '-g',
        '30',
        '-keyint_min',
        '30',
        '-c:a',
        'libopus',
        '-b:a',
        '128k',
        '-row-mt',
        '1',
        '-deadline',
        'realtime',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (error) => reject(error))

    command.run()
  })

  const stats = await fs.stat(outputPath)

  return {
    filePath: outputPath,
    mimeType: 'video/webm',
    size: stats.size,
  }
}

export async function extractVideoPoster(inputPath: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(getTempDir(), 'payload-poster-'))
  const posterPath = path.join(tempDir, 'poster.jpg')

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(0)
      .frames(1)
      .output(posterPath)
      .on('end', () => resolve())
      .on('error', (error) => reject(error))
      .run()
  })

  return posterPath
}
