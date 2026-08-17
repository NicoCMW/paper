import type { LibraryAsset } from "../domain/model";
import { assetUrl } from "./api";

type AssetLibraryPanelProps = {
  assets: LibraryAsset[];
  onInsert: (asset: LibraryAsset) => void;
  onClose: () => void;
};

function FolderMark() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" /><path d="M3.5 9h17" /></svg>;
}

function CloseMark() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

function SearchMark() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="5.8" /><path d="m15.2 15.2 4.3 4.3" /></svg>;
}

export function AssetLibraryPanel({ assets, onInsert, onClose }: AssetLibraryPanelProps) {
  return <aside className="asset-library-panel" aria-label="Reusable Assets" onPointerDown={(event) => event.stopPropagation()}>
    <div className="library-panel-header">
      <div className="library-panel-title"><FolderMark /><div><strong>Assets</strong><span>Local library</span></div></div>
      <button type="button" className="panel-close" onClick={onClose} aria-label="Close Assets"><CloseMark /></button>
    </div>
    <div className="library-search"><SearchMark /><span>Search assets</span></div>
    <div className="library-tabs"><span className="is-active">All</span><span>Images</span><span>Icons</span></div>
    {assets.length === 0 ? <div className="library-empty"><FolderMark /><strong>Your library is empty</strong><span>Select an Asset on the Canvas and use “Save” to keep it here.</span></div> : <>
      <div className="library-folder-row"><FolderMark /><div><strong>Saved Assets</strong><span>{assets.length} {assets.length === 1 ? "item" : "items"}</span></div><span className="library-chevron">›</span></div>
      <div className="library-grid">
        {assets.map((asset) => <button key={asset.id} type="button" className="library-asset" onClick={() => onInsert(asset)} title={`Add ${asset.name} to the Canvas`}>
          <span className="library-thumb"><img src={assetUrl(asset.path)} alt="" draggable={false} /></span>
          <span className="library-asset-name">{asset.name}</span>
          <span className="library-asset-size">{Math.round(asset.width)} × {Math.round(asset.height)}</span>
        </button>)}
      </div>
      <p className="library-hint">Click an Asset to add a copy near the current selection.</p>
    </>}
  </aside>;
}
