import type { Asset } from "../domain/model";
import { assetUrl } from "./api";
import { createYoutubePreviewVideos, type YoutubePreviewVideo } from "./youtube-preview";

type PreviewMode = "youtube" | "carousel";
type PreviewDevice = "desktop" | "mobile";

type PreviewPanelProps = {
  assets: Asset[];
  mode: PreviewMode;
  device: PreviewDevice;
  carouselIndex: number;
  youtubeTitle: string;
  youtubeDark: boolean;
  youtubeSeed: number;
  onModeChange: (mode: PreviewMode) => void;
  onDeviceChange: (device: PreviewDevice) => void;
  onCarouselIndexChange: (index: number) => void;
  onYoutubeTitleChange: (title: string) => void;
  onYoutubeDarkChange: (dark: boolean) => void;
  onClose: () => void;
};

function CloseMark() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

function ArrowMark({ direction }: { direction: "left" | "right" }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d={direction === "left" ? "m14 5-7 7 7 7" : "m10 5 7 7-7 7"} /></svg>;
}

function SearchMark() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="5.8" /><path d="m15.2 15.2 4.3 4.3" /></svg>;
}

function SelectedImage({ asset, className = "" }: { asset: Asset; className?: string }) {
  return <img className={className} src={assetUrl(asset.path)} alt={asset.name} draggable={false} />;
}

function EmptyPreview() {
  return <div className="preview-empty"><span className="preview-empty-mark">+</span><strong>Select an Asset</strong><span>Select one or more images on the Canvas to see how they read in context.</span></div>;
}

function YoutubeThumb({ video, className = "" }: { video: YoutubePreviewVideo; className?: string }) {
  return <div className={`yt-thumb ${video.isTarget ? "is-target" : ""} ${className}`}>
    {video.asset ? <SelectedImage asset={video.asset} /> : <img src={video.samplePath} alt="" draggable={false} onError={(event) => { event.currentTarget.style.display = "none"; }} />}
    <span className="yt-duration">{video.duration}</span>
  </div>;
}

function ChannelAvatar({ index = 0 }: { index?: number }) {
  return <span className={`yt-channel-avatar avatar-${index % 5}`} />;
}

function VideoMeta({ video, index = 0, compact = false }: { video: YoutubePreviewVideo; index?: number; compact?: boolean }) {
  return <div className={`yt-video-meta${compact ? " is-compact" : ""}`}><ChannelAvatar index={index} /><div><strong>{video.title}</strong><span>{video.channel} · {video.views} · {video.age}</span></div></div>;
}

function VideoCard({ video, index, variant = "grid" }: { video: YoutubePreviewVideo; index: number; variant?: "grid" | "row" | "sidebar" }) {
  return <article className={`yt-video-card yt-card-${variant}`}><YoutubeThumb video={video} /><VideoMeta video={video} index={index} compact={variant !== "grid"} /></article>;
}

function surfaceVideos(videos: YoutubePreviewVideo[], count: number): YoutubePreviewVideo[] {
  const visible = videos.slice(0, count);
  const targetIndex = videos.findIndex((video) => video.isTarget);
  if (targetIndex < 0 || targetIndex < count) return visible;
  const target = videos[targetIndex];
  const neighbours = videos.filter((video) => !video.isTarget).slice(0, count - 1);
  neighbours.splice(targetIndex % count, 0, target);
  return neighbours;
}

function YoutubeSurface({ title, videos, variant, dark }: { title: string; videos: YoutubePreviewVideo[]; variant: "home-large" | "home-small" | "sidebar" | "channel-large" | "channel-small" | "history" | "watch-large" | "watch-list" | "mobile-full" | "mobile-column"; dark: boolean }) {
  const className = `yt-surface yt-surface-${variant}${dark ? " is-dark" : ""}`;
  if (variant === "sidebar" || variant === "watch-list" || variant === "mobile-column") return <section className={className}><h3>{title}</h3><div className="yt-list">{surfaceVideos(videos, 5).map((video, index) => <VideoCard key={video.id} video={video} index={index} variant="sidebar" />)}</div></section>;
  return <section className={className}><h3>{title}</h3><div className="yt-surface-content">{surfaceVideos(videos, variant === "home-large" ? 6 : 4).map((video, index) => <VideoCard key={video.id} video={video} index={index} variant={variant === "home-large" ? "grid" : "row"} />)}</div></section>;
}

function YoutubePreview({ selected, title, dark, device, seed, onTitleChange, onDarkChange, onDeviceChange }: { selected: Asset[]; title: string; dark: boolean; device: PreviewDevice; seed: number; onTitleChange: (title: string) => void; onDarkChange: (dark: boolean) => void; onDeviceChange: (device: PreviewDevice) => void }) {
  const target = selected[0];
  if (!target) return <EmptyPreview />;
  const videos = createYoutubePreviewVideos(target, title, seed);
  const targetVideo = videos.find((video) => video.isTarget) ?? videos[0];
  return <div className={`youtube-simulator ${dark ? "is-dark" : ""}`}>
    <aside className="youtube-settings">
      <label className="youtube-field"><span>Video title</span><input value={title} maxLength={100} onChange={(event) => onTitleChange(event.target.value)} placeholder="Write a title" /><small>{title.length}/100</small></label>
      <div className="youtube-setting-group"><span className="youtube-setting-label">Appearance</span><div className="segmented-control"><button type="button" className={!dark ? "is-active" : ""} onClick={() => onDarkChange(false)}>Light</button><button type="button" className={dark ? "is-active" : ""} onClick={() => onDarkChange(true)}>Dark</button></div></div>
      <div className="youtube-setting-group"><span className="youtube-setting-label">Surface</span><div className="segmented-control"><button type="button" className={device === "desktop" ? "is-active" : ""} onClick={() => onDeviceChange("desktop")}>Desktop</button><button type="button" className={device === "mobile" ? "is-active" : ""} onClick={() => onDeviceChange("mobile")}>Mobile</button></div></div>
      <div className="youtube-selected-thumb"><span>Selected thumbnail</span><YoutubeThumb video={targetVideo} /></div>
      <p className="youtube-selection-note">Change the selected Asset on the Canvas to preview another thumbnail.</p>
    </aside>
    <div className={`youtube-surfaces ${device === "mobile" ? "is-mobile-focus" : ""}`}>
      <div className="youtube-surface-toolbar"><span><b>Preview</b> YouTube surfaces simulator</span><div><SearchMark /><span className="youtube-toolbar-dot" /></div></div>
      <YoutubeSurface title="Home — Large Grid" videos={videos} variant="home-large" dark={dark} />
      <YoutubeSurface title="Home — Small Row" videos={videos} variant="home-small" dark={dark} />
      <div className="yt-surface-split"><YoutubeSurface title="Sidebar" videos={videos} variant="sidebar" dark={dark} /><YoutubeSurface title="Channel Page — Large" videos={videos} variant="channel-large" dark={dark} /></div>
      <YoutubeSurface title="Channel Page — Small" videos={videos} variant="channel-small" dark={dark} />
      <YoutubeSurface title="History" videos={videos} variant="history" dark={dark} />
      <YoutubeSurface title="Watch Later — Large" videos={videos} variant="watch-large" dark={dark} />
      <YoutubeSurface title="Watch Later — List" videos={videos} variant="watch-list" dark={dark} />
      <div className="yt-surface-split mobile-surfaces"><YoutubeSurface title="Mobile — Full Width" videos={videos} variant="mobile-full" dark={dark} /><YoutubeSurface title="Mobile — Column" videos={videos} variant="mobile-column" dark={dark} /></div>
    </div>
  </div>;
}

function CarouselPreview({ assets, index, onIndexChange }: { assets: Asset[]; index: number; onIndexChange: (index: number) => void }) {
  const target = assets[index] ?? assets[0];
  if (!target) return <EmptyPreview />;
  const safeIndex = assets.indexOf(target);
  return <div className="carousel-preview">
    <article className="social-post">
      <header className="social-post-header"><span className="social-avatar" /><strong>your.channel</strong><span className="social-more">•••</span></header>
      <div className="social-media"><SelectedImage asset={target} /><button type="button" className="carousel-arrow left" onClick={() => onIndexChange((safeIndex - 1 + assets.length) % assets.length)} aria-label="Previous slide"><ArrowMark direction="left" /></button><button type="button" className="carousel-arrow right" onClick={() => onIndexChange((safeIndex + 1) % assets.length)} aria-label="Next slide"><ArrowMark direction="right" /></button><div className="carousel-dots">{assets.map((asset, dotIndex) => <span key={asset.id} className={dotIndex === safeIndex ? "is-active" : ""} />)}</div></div>
      <div className="social-post-actions"><span>♡</span><span>◯</span><span>⌁</span><span className="push-right">□</span></div>
      <div className="social-post-copy"><strong>12,104 likes</strong><span><b>your.channel</b> A useful visual idea to take into your next post.</span><span>View all 176 comments</span><small>JULY 26</small></div>
    </article>
    <div className="carousel-strip-label">Carousel <span>({assets.length} slides)</span></div>
    <div className="carousel-strip">{assets.map((asset, slideIndex) => <button type="button" key={asset.id} className={`carousel-slide${slideIndex === safeIndex ? " is-active" : ""}`} onClick={() => onIndexChange(slideIndex)}><SelectedImage asset={asset} /><span>{slideIndex + 1}</span></button>)}</div>
  </div>;
}

export function PreviewPanel({ assets, mode, device, carouselIndex, youtubeTitle, youtubeDark, youtubeSeed, onModeChange, onDeviceChange, onCarouselIndexChange, onYoutubeTitleChange, onYoutubeDarkChange, onClose }: PreviewPanelProps) {
  return <aside className={`preview-panel preview-${mode}`} aria-label="Preview" onPointerDown={(event) => event.stopPropagation()}>
    <div className="preview-panel-header"><strong>Preview</strong><button type="button" className="panel-close" onClick={onClose} aria-label="Close Preview"><CloseMark /></button></div>
    <div className="preview-mode-tabs"><button type="button" className={mode === "youtube" ? "is-active" : ""} onClick={() => onModeChange("youtube")}>YouTube</button><button type="button" className={mode === "carousel" ? "is-active" : ""} onClick={() => onModeChange("carousel")}>Carousel</button></div>
    <div className="preview-panel-content">{mode === "youtube" ? <YoutubePreview selected={assets} title={youtubeTitle} dark={youtubeDark} device={device} seed={youtubeSeed} onTitleChange={onYoutubeTitleChange} onDarkChange={onYoutubeDarkChange} onDeviceChange={onDeviceChange} /> : <><div className="preview-device-row"><span>Context</span><div className="segmented-control"><button type="button" className={device === "desktop" ? "is-active" : ""} onClick={() => onDeviceChange("desktop")}>Desktop</button><button type="button" className={device === "mobile" ? "is-active" : ""} onClick={() => onDeviceChange("mobile")}>Mobile</button></div></div><CarouselPreview assets={assets} index={carouselIndex} onIndexChange={onCarouselIndexChange} /></>}</div>
    <div className="preview-panel-footer">Preview uses the current Canvas selection.</div>
  </aside>;
}
