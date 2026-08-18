import io
import wave
import json
import httpx
from PIL import Image

def test_endpoints():
    client = httpx.Client(base_url="http://localhost:8000", timeout=30.0)

    # 1. Health check
    res_health = client.get("/health")
    print("Health check status:", res_health.status_code, res_health.json())
    assert res_health.status_code == 200

    # 2. Voice transcribe endpoint
    buf = io.BytesIO()
    w = wave.open(buf, "wb")
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(16000)
    w.writeframes(b"\x00\x00" * 16000)
    w.close()
    wav_bytes = buf.getvalue()

    res_transcribe = client.post(
        "/complaints/transcribe",
        files={"audio": ("test_recording.wav", wav_bytes, "audio/wav")}
    )
    print("Transcribe status:", res_transcribe.status_code, res_transcribe.json())
    assert res_transcribe.status_code == 200
    assert "text" in res_transcribe.json()

    # 3. Image YOLO analyze endpoint
    img_buf = io.BytesIO()
    img = Image.new("RGB", (320, 320), color=(200, 50, 50))
    img.save(img_buf, format="JPEG")
    img_bytes = img_buf.getvalue()

    res_img = client.post(
        "/complaints/image/analyze",
        files={"image": ("test_incident.jpg", img_bytes, "image/jpeg")}
    )
    print("Image analyze status:", res_img.status_code)
    img_data = res_img.json()
    print("Image analyze output keys:", img_data.keys())
    print("Total detections:", img_data["total_detections"])
    print("Summary:", img_data["summary"])
    assert res_img.status_code == 200
    assert "detections" in img_data
    assert "annotated_image" in img_data

    # 4. Text complaint analysis endpoint
    res_analyze = client.post(
        "/complaints/analyze",
        json={"text": "Large pothole on main road near bus station", "lat": 28.6139, "lng": 77.2090}
    )
    print("Complaint analyze status:", res_analyze.status_code, res_analyze.json()["category"])
    assert res_analyze.status_code == 200

    # 5. Full complaint submission
    res_submit = client.post(
        "/complaints",
        json={"text": "Large pothole on main road near bus station", "lat": 28.6139, "lng": 77.2090}
    )
    print("Complaint submit status:", res_submit.status_code, "Ticket ID:", res_submit.json()["id"])
    assert res_submit.status_code == 200

    print("\nALL BACKEND VOICE AND YOLO ENDPOINTS VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    test_endpoints()
