import io
import os
import base64
import logging
from typing import Optional
from PIL import Image

logger = logging.getLogger(__name__)

_yolo_model = None

# Mapping common detected objects to civic complaint categories & natural descriptions
CIVIC_CLASS_MAPPING = {
    "traffic light": {"category": "Street Light", "desc": "Malfunctioning or damaged traffic signal"},
    "stop sign": {"category": "Road Infrastructure", "desc": "Damaged or obscured road sign"},
    "fire hydrant": {"category": "Water Department", "desc": "Fire hydrant leak or obstruction"},
    "bench": {"category": "Parks & Gardens", "desc": "Damaged public bench or park amenity"},
    "car": {"category": "Road Infrastructure", "desc": "Vehicle obstruction or road incident"},
    "truck": {"category": "Industrial Safety", "desc": "Heavy vehicle hazard or traffic block"},
    "bus": {"category": "Road Infrastructure", "desc": "Public transit obstruction"},
    "bicycle": {"category": "Road Infrastructure", "desc": "Bicycle path hazard"},
    "motorcycle": {"category": "Road Infrastructure", "desc": "Motorcycle road incident"},
    "pothole": {"category": "Road Infrastructure", "desc": "Road surface pothole or crater"},
    "bottle": {"category": "Sanitation", "desc": "Litter and plastic waste accumulation"},
    "cup": {"category": "Sanitation", "desc": "Commercial litter and waste"},
    "trash": {"category": "Sanitation", "desc": "Accumulated garbage or waste dump"},
}


def get_model():
    """Lazy load the YOLO model."""
    global _yolo_model
    if _yolo_model is None:
        from ultralytics import YOLO
        # Look for model in current working directory or backend root
        model_paths = [
            "yolov8n.pt",
            os.path.join(os.path.dirname(__file__), "..", "..", "yolov8n.pt"),
            os.path.abspath("yolov8n.pt"),
        ]
        chosen_path = "yolov8n.pt"
        for p in model_paths:
            if os.path.exists(p):
                chosen_path = p
                break
        logger.info(f"Loading YOLO model from {chosen_path}")
        _yolo_model = YOLO(chosen_path)
    return _yolo_model


def analyze_image_with_yolo(image_bytes: bytes, conf_threshold: float = 0.25) -> dict:
    """
    Run YOLO object detection on image bytes.
    Returns detected objects, confidence scores, bounding boxes, and an annotated base64 image.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        logger.error(f"Failed to decode image: {e}")
        raise ValueError("Invalid image file format. Please upload a valid JPG, PNG, or WEBP image.")

    try:
        model = get_model()
        results = model(image, conf=conf_threshold, verbose=False)
        result = results[0]
    except Exception as e:
        logger.error(f"YOLO inference error: {e}")
        raise RuntimeError(f"Image analysis failed: {str(e)}")

    detections = []
    classes_found = []

    if result.boxes is not None and len(result.boxes) > 0:
        boxes = result.boxes
        for i in range(len(boxes)):
            cls_id = int(boxes.cls[i].item())
            cls_name = result.names.get(cls_id, f"object_{cls_id}")
            confidence = float(boxes.conf[i].item())
            xyxy = boxes.xyxy[i].tolist()  # [x1, y1, x2, y2]

            mapping = CIVIC_CLASS_MAPPING.get(cls_name.lower(), {
                "category": "Civic Operations",
                "desc": f"{cls_name.capitalize()} observed in scene",
            })

            detections.append({
                "class": cls_name,
                "confidence": round(confidence, 2),
                "confidence_pct": round(confidence * 100),
                "bbox": [round(coord, 1) for coord in xyxy],
                "suggested_category": mapping["category"],
                "description": mapping["desc"],
            })
            classes_found.append(cls_name)

    # Sort detections by confidence descending
    detections.sort(key=lambda d: d["confidence"], reverse=True)

    # Generate annotated image using YOLO's plot()
    annotated_b64 = None
    try:
        annotated_np = result.plot()  # BGR numpy array
        # Convert BGR to RGB
        annotated_img = Image.fromarray(annotated_np[..., ::-1])
        buf = io.BytesIO()
        annotated_img.save(buf, format="JPEG", quality=85)
        annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception as e:
        logger.warning(f"Could not generate annotated image: {e}")

    # Build natural language summary for complaint text
    if detections:
        top = detections[0]
        top_name = top["class"].capitalize()
        top_conf = top["confidence_pct"]
        if len(detections) == 1:
            summary = f"Photo inspection detected {top['class']} ({top_conf}% confidence). {top['description']}."
        else:
            other_names = ", ".join([d["class"] for d in detections[1:3]])
            summary = f"Photo inspection detected {top['class']} ({top_conf}% confidence) along with {other_names}. {top['description']}."
        suggested_category = top["suggested_category"]
    else:
        summary = "No specific civic hazard was confidently detected by the automated model. Please review the photo."
        suggested_category = "General Inquiry"

    return {
        "has_detections": len(detections) > 0,
        "total_detections": len(detections),
        "detections": detections,
        "summary": summary,
        "suggested_category": suggested_category,
        "annotated_image": annotated_b64,
    }
