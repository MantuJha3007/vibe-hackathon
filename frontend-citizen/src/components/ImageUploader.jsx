import { useState, useRef } from "react";
import { analyzeImage } from "../api/client";

export default function ImageUploader({ onDetectionReady, disabled }) {
  // States: 'idle' | 'preview' | 'analyzing' | 'complete'
  const [state, setState] = useState("idle");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  function handleFileSelect(file) {
    if (!file) return;

    // Validate type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMsg("Unsupported file format. Please upload a JPG, PNG, or WEBP image.");
      return;
    }

    // Validate size (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Image size exceeds 10 MB. Please choose a smaller photo.");
      return;
    }

    setErrorMsg("");
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    setState("preview");
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleRemove() {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    setDetectionResult(null);
    setErrorMsg("");
    setState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleAnalyze() {
    if (!imageFile) return;
    setState("analyzing");
    setErrorMsg("");

    try {
      const result = await analyzeImage(imageFile);
      setDetectionResult(result);
      setState("complete");
    } catch (err) {
      console.error("YOLO analysis error:", err);
      setErrorMsg(err.message || "We couldn't analyze the image. Please try again or type your complaint.");
      setState("preview");
    }
  }

  function handleUseDetection() {
    if (!detectionResult) return;
    onDetectionReady({
      summary: detectionResult.summary || "Civic hazard identified via photo inspection.",
      suggestedCategory: detectionResult.suggested_category || "",
      detections: detectionResult.detections || [],
      annotatedImage: detectionResult.annotated_image || null,
      file: imageFile,
    });
  }

  return (
    <div className="image-uploader-card">
      {errorMsg && (
        <div className="image-error-banner">
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      {/* 1. Idle State: Upload Dropzone */}
      {state === "idle" && (
        <div
          className={`image-dropzone ${isDragOver ? "drag-over" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
            disabled={disabled}
            id="input-file-image"
          />
          <div className="dropzone-icon">🖼️</div>
          <div className="dropzone-title">Upload an incident photo</div>
          <div className="dropzone-subtitle">JPG, PNG or WEBP • Max 10 MB</div>
          <button
            type="button"
            className="btn-choose-image"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={disabled}
            id="btn-choose-image"
          >
            Choose Image
          </button>
        </div>
      )}

      {/* 2. Preview State (Photo chosen, awaiting user click to analyze) */}
      {state === "preview" && (
        <div className="image-preview-box">
          <div className="preview-media-container">
            <img src={imagePreviewUrl} alt="Incident preview" className="preview-img" />
          </div>
          <div className="preview-meta-row">
            <div className="preview-file-info">
              <span className="preview-filename">{imageFile?.name}</span>
              <span className="preview-filesize">
                {((imageFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
            <div className="preview-actions">
              <button
                type="button"
                className="btn-replace-image"
                onClick={() => fileInputRef.current?.click()}
              >
                Replace
              </button>
              <button
                type="button"
                className="btn-remove-image"
                onClick={handleRemove}
              >
                Remove
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
          <button
            type="button"
            className="btn-analyze-image"
            onClick={handleAnalyze}
            id="btn-analyze-image"
          >
            Analyze Image with YOLO →
          </button>
        </div>
      )}

      {/* 3. Analyzing State */}
      {state === "analyzing" && (
        <div className="image-analyzing-box">
          <div className="analyzing-spinner" />
          <div className="analyzing-title">ANALYZING IMAGE</div>
          <div className="analyzing-sub">Sentinel YOLO model is inspecting the incident photo...</div>
        </div>
      )}

      {/* 4. Complete State (YOLO detections & annotated image display) */}
      {state === "complete" && detectionResult && (
        <div className="image-results-box">
          <div className="results-header">
            <span className="results-status-badge">
              <span className="status-dot-sm" />
              IMAGE ANALYSIS COMPLETE
            </span>
          </div>

          {/* Detections List */}
          <div className="detections-card">
            <div className="detections-title">
              {detectionResult.has_detections ? "Detected Issues" : "Detection Notice"}
            </div>

            {detectionResult.has_detections ? (
              <div className="detections-list">
                {detectionResult.detections.map((det, i) => (
                  <div key={i} className="detection-item">
                    <div className="detection-left">
                      <span className="detection-bullet">🎯</span>
                      <div>
                        <span className="detection-class">{det.class}</span>
                        <div className="detection-desc">{det.description}</div>
                      </div>
                    </div>
                    <div className="detection-right">
                      <span className="detection-conf-badge">{det.confidence_pct}%</span>
                      <span className="detection-conf-label">confidence</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-detection-msg">
                No specific civic hazard was confidently detected in this photo. You can still use it and provide details manually.
              </div>
            )}
          </div>

          {/* Side-by-Side or Stacked Image Comparison */}
          <div className="comparison-grid">
            <div className="comparison-pane">
              <div className="pane-label">Original Photo</div>
              <img src={imagePreviewUrl} alt="Original" className="comparison-img" />
            </div>
            {detectionResult.annotated_image && (
              <div className="comparison-pane">
                <div className="pane-label">YOLO Detection Bounding Boxes</div>
                <img
                  src={detectionResult.annotated_image}
                  alt="Annotated Detection"
                  className="comparison-img"
                />
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="results-actions-row">
            <button
              type="button"
              className="btn-retry-image"
              onClick={handleRemove}
            >
              Choose Another Photo
            </button>
            <button
              type="button"
              className="btn-use-detection"
              onClick={handleUseDetection}
              id="btn-use-detection"
            >
              Use Detection for Complaint →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
