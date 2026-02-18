interface VideoPlayerProps {
  src: string;
  className?: string;
}

const getVideoType = (url: string): string => {
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  const typeMap: Record<string, string> = {
    mov: 'video/mp4',
    mp4: 'video/mp4',
    webm: 'video/webm',
  };
  return typeMap[ext || ''] || 'video/mp4';
};

const VideoPlayer = ({ src, className = "w-full rounded-lg" }: VideoPlayerProps) => {
  return (
    <video controls className={className} playsInline>
      <source src={src} type={getVideoType(src)} />
      <source src={src} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
};

export default VideoPlayer;
