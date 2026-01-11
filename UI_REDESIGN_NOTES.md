# UI Redesign for Post-Generation Flow

## Current Flow (Problem)
1. User generates image in Prompt mode
2. Image appears but user has to manually switch to "Edit Thumbnail" section
3. Separate UI for editing

## New Flow (Solution)
1. User generates image in Prompt mode
2. Image appears with action buttons below:
   - **Download** button
   - **Save** button  
   - **Edit** button
3. Below image: **Prompt / Recreate / Edit** mode selector buttons
4. Below that: **Sticky prompt box** for regeneration
5. When **Edit** is clicked:
   - Canvas overlay appears on image
   - Brush controls appear (size slider, clear button)
   - User can paint and regenerate

## Key Changes Needed

### 1. Add Download/Save/Edit Buttons
```tsx
{images.original && (
  <div className="flex justify-center gap-3 mt-4">
    <button onClick={handleDownload} className="glass-panel px-6 py-3 rounded-xl">
      <DownloadIcon /> Download
    </button>
    <button onClick={handleSave} className="glass-panel px-6 py-3 rounded-xl">
      <SaveIcon /> Save
    </button>
    <button 
      onClick={() => setShowEditControls(!showEditControls)} 
      className={showEditControls ? 'glass-button' : 'glass-panel'}
    >
      <EditIcon /> Edit
    </button>
  </div>
)}
```

### 2. Mode Selector Below Image
```tsx
<div className="flex justify-center gap-3 mt-6">
  <button onClick={() => setEditMode('prompt')} className={...}>
    Prompt
  </button>
  <button onClick={() => setEditMode('recreate')} className={...}>
    Recreate
  </button>
  <button onClick={() => setEditMode('edit')} className={...}>
    Edit
  </button>
</div>
```

### 3. Sticky Prompt Box
```tsx
<div className="mt-6 glass-panel rounded-2xl p-6">
  <textarea value={prompt} onChange={...} />
  <div className="flex justify-between mt-4">
    <div className="flex gap-3">
      <button>Personas</button>
      <button>Styles</button>
    </div>
    <button onClick={handleGenerate}>Generate</button>
  </div>
</div>
```

### 4. Edit Controls (Conditional)
```tsx
{showEditControls && (
  <div className="mt-4 glass-panel rounded-xl p-4">
    <div className="flex items-center justify-between">
      <span>Brush Size: {brushSize}px</span>
      <button onClick={clearCanvas}>Clear</button>
    </div>
    <input 
      type="range" 
      min="1" 
      max="100" 
      value={brushSize}
      onChange={(e) => setBrushSize(parseInt(e.target.value))}
    />
  </div>
)}
```

### 5. Canvas Overlay (Conditional)
```tsx
{showEditControls && (
  <canvas
    ref={canvasRef}
    className="absolute inset-0 w-full h-full cursor-crosshair"
    onMouseDown={startPainting}
    onMouseMove={paint}
    onMouseUp={stopPainting}
  />
)}
```

## Implementation Steps

1. Remove the separate "Edit Thumbnail" section entirely
2. Keep only the initial prompt/recreate/edit selector for first-time users
3. After first generation, show the new flow with image + buttons + sticky prompt
4. Make edit controls conditional based on `showEditControls` state
5. Keep canvas overlay conditional on edit mode

## Benefits
- Single-page flow (no navigation needed)
- Faster iteration (prompt box always visible)
- Clearer actions (Download/Save/Edit buttons)
- Better UX (everything in one place)
