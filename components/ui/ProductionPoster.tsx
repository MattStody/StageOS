import { cn } from '@/lib/cn'

interface ProductionPosterProps {
  imageUrl: string
  alt?: string
  className?: string
  onError?: () => void
}

export function ProductionPoster({ imageUrl, alt = 'Production poster', className, onError }: ProductionPosterProps) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-lg bg-stone-900', className)}
      style={{ aspectRatio: '4 / 5' }}
    >
      {/* Blurred background fill — scaled up so blurred edges stay hidden */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(22px)',
          transform: 'scale(1.15)',
        }}
      />
      {/* Subtle darkening overlay */}
      <div className="absolute inset-0 bg-black/20" />
      {/* Foreground image — contained within frame */}
      <img
        src={imageUrl}
        alt={alt}
        className="absolute inset-0 w-full h-full object-contain z-10"
        onError={onError ? () => onError() : (e) => { (e.target as HTMLImageElement).style.opacity = '0' }}
      />
    </div>
  )
}
