import urllib.request
import io
import httpx
from PIL import Image

def test_yolo_objects():
    client = httpx.Client(base_url="http://localhost:8000", timeout=30.0)

    # Let's fetch a small public image with a bus / car from Wikimedia Commons or draw/load an image
    url = "https://raw.githubusercontent.com/ultralytics/ultralytics/main/ultralytics/assets/bus.jpg"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        img_bytes = urllib.request.urlopen(req, timeout=10).read()
        print(f"Downloaded standard YOLO test image ({len(img_bytes)} bytes)")
    except Exception as e:
        print(f"Could not download online image ({e}), generating local test image...")
        img = Image.new("RGB", (640, 640), color=(120, 120, 120))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        img_bytes = buf.getvalue()

    res = client.post(
        "/complaints/image/analyze",
        files={"image": ("bus_test.jpg", img_bytes, "image/jpeg")}
    )
    print("Response status:", res.status_code)
    data = res.json()
    print("Detections found:", len(data.get("detections", [])))
    for d in data.get("detections", []):
        print(f"  - Class: {d['class']} | Conf: {d['confidence_pct']}% | Category: {d['suggested_category']} | BBox: {d['bbox']}")
    print("Summary:", data.get("summary"))
    print("Annotated image length:", len(data.get("annotated_image") or ""))

if __name__ == "__main__":
    test_yolo_objects()
