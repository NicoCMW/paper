import type { Asset } from "../domain/model";
import { assetUrl } from "./api";

type PreviewMode = "youtube" | "carousel";
type PreviewDevice = "desktop" | "mobile";

type PreviewPanelProps = {
  assets: Asset[];
  mode: PreviewMode;
  device: PreviewDevice;
  carouselIndex: number;
  onModeChange: (mode: PreviewMode) => void;
  onDeviceChange: (device: PreviewDevice) => void;
  onCarouselIndexChange: (index: number) => void;
  onClose: () => void;
};

function CloseMark() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

function ArrowMark({ direction }: { direction: "left" | "right" }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d={direction === "left" ? "m14 5-7 7 7 7" : "m10 5 7 7-7 7"} /></svg>;
}

function SelectedImage({ asset, className = "" }: { asset: Asset; className?: string }) {
  return <img className={className} src={assetUrl(asset.path)} alt={asset.name} draggable={false} />;
}

function EmptyPreview() {
  return <div className="preview-empty"><span className="preview-empty-mark">+</span><strong>Select an Asset</strong><span>Select one or more images on the Canvas to see how they read in context.</span></div>;
}

function YoutubePreview({ assets, device }: { assets: Asset[]; device: PreviewDevice }) {
  const target = assets[0];
  const feed = assets.length > 1 ? assets.slice(0, 6) : [target];
  if (!target) return <EmptyPreview />;
  return <div className={`youtube-preview ${device}`}>
    <div className="youtube-context-bar"><span className="youtube-wordmark"><i />YouTube</span><span className="youtube-search-bar" /><span className="youtube-avatar" /></div>
    <div className="youtube-context-filters"><span className="is-active">All</span><span>Creative</span><span>Marketing</span><span>New</span></div>
    <div className="youtube-feed">
      {feed.map((asset, index) => <article key={`${asset.id}-${index}`} className={`youtube-video-card${index === 0 ? " is-target" : ""}`}>
        <div className="youtube-thumb"><SelectedImage asset={asset} /><span className="youtube-duration">12:34</span></div>
        <div className="youtube-video-copy"><span className="youtube-channel-avatar" /><div><strong>{index === 0 ? asset.name.replace(/\.[^.]+$/, "") : ["How I plan my next video", "The new rules of visual ideas", "A practical creative workflow", "What I learned this week", "Build better thumbnails"][index - 1] ?? "Recommended video"}</strong><span>Your Channel · 123K views · 1 hour ago</span></div></div>
      </article>)}
      {feed.length === 1 && <><article className="youtube-placeholder-card"><div /><span>Recommended video</span></article><article className="youtube-placeholder-card"><div /><span>New ideas from your feed</span></article></>}
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

export function PreviewPanel({ assets, mode, device, carouselIndex, onModeChange, onDeviceChange, onCarouselIndexChange, onClose }: PreviewPanelProps) {
  return <aside className={`preview-panel preview-${mode}`} aria-label="Preview" onPointerDown={(event) => event.stopPropagation()}>
    <div className="preview-panel-header"><strong>Preview</strong><button type="button" className="panel-close" onClick={onClose} aria-label="Close Preview"><CloseMark /></button></div>
    <div className="preview-mode-tabs"><button type="button" className={mode === "youtube" ? "is-active" : ""} onClick={() => onModeChange("youtube")}>YouTube</button><button type="button" className={mode === "carousel" ? "is-active" : ""} onClick={() => onModeChange("carousel")}>Carousel</button></div>
    <div className="preview-device-row"><span>Context</span><div className="segmented-control"><button type="button" className={device === "desktop" ? "is-active" : ""} onClick={() => onDeviceChange("desktop")}>Desktop</button><button type="button" className={device === "mobile" ? "is-active" : ""} onClick={() => onDeviceChange("mobile")}>Mobile</button></div></div>
    <div className="preview-panel-content">{mode === "youtube" ? <YoutubePreview assets={assets} device={device} /> : <CarouselPreview assets={assets} index={carouselIndex} onIndexChange={onCarouselIndexChange} />}</div>
    <div className="preview-panel-footer">Preview uses the current Canvas selection.</div>
  </aside>;
}
