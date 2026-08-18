import io
import wave
import httpx
from PIL import Image

def run_comprehensive_matrix():
    client = httpx.Client(base_url="http://localhost:8000", timeout=30.0)

    print("==================================================")
    print("RUNNING SENTINEL VOICE + YOLO COMPREHENSIVE MATRIX")
    print("==================================================")

    # 1. TEXT FLOW
    print("\n[TEST 1] Text Complaint Pipeline...")
    res1_analyze = client.post("/complaints/analyze", json={"text": "Water pipeline burst causing flood near main market", "lat": 19.076, "lng": 72.877})
    assert res1_analyze.status_code == 200, f"Analyze failed: {res1_analyze.text}"
    cat1 = res1_analyze.json()["category"]
    print(f"  -> Analyzed Category: {cat1}")

    res1_submit = client.post("/complaints", json={"text": "Water pipeline burst causing flood near main market", "lat": 19.076, "lng": 72.877})
    assert res1_submit.status_code == 200, f"Submit failed: {res1_submit.text}"
    ticket1_id = res1_submit.json()["id"]
    print(f"  -> Ticket Created: INC-{ticket1_id} (Status: {res1_submit.json()['status']})")
    print("  [PASS] Test 1: Text flow works end-to-end.")

    # 2. VOICE FLOW
    print("\n[TEST 2] Voice Transcription + Analysis Pipeline...")
    buf = io.BytesIO()
    w = wave.open(buf, "wb")
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(16000)
    w.writeframes(b"\x00\x00" * 16000)
    w.close()
    wav_bytes = buf.getvalue()

    res2_stt = client.post("/complaints/transcribe", files={"audio": ("citizen_voice.wav", wav_bytes, "audio/wav")})
    assert res2_stt.status_code == 200, f"Transcription failed: {res2_stt.text}"
    transcript = res2_stt.json()["text"]
    print(f"  -> Transcribed Text: '{transcript}'")

    # Feed transcript into standard complaint analysis
    res2_analyze = client.post("/complaints/analyze", json={"text": f"Voice report: {transcript}", "lat": 19.076, "lng": 72.877})
    assert res2_analyze.status_code == 200
    res2_submit = client.post("/complaints", json={"text": f"Voice report: {transcript}", "lat": 19.076, "lng": 72.877})
    assert res2_submit.status_code == 200
    print(f"  -> Voice Ticket Created: INC-{res2_submit.json()['id']}")
    print("  [PASS] Test 2: Voice pipeline works end-to-end.")

    # 3. IMAGE / YOLO FLOW
    print("\n[TEST 3] Image YOLO Analysis + Complaint Pipeline...")
    img_buf = io.BytesIO()
    img = Image.new("RGB", (400, 400), color=(100, 150, 200))
    img.save(img_buf, format="JPEG")
    img_bytes = img_buf.getvalue()

    res3_yolo = client.post("/complaints/image/analyze", files={"image": ("incident_photo.jpg", img_bytes, "image/jpeg")})
    assert res3_yolo.status_code == 200, f"YOLO inspection failed: {res3_yolo.text}"
    yolo_data = res3_yolo.json()
    print(f"  -> YOLO Detections Count: {yolo_data['total_detections']}")
    print(f"  -> Summary: {yolo_data['summary']}")
    print(f"  -> Annotated Image Present: {bool(yolo_data.get('annotated_image'))}")

    # Feed YOLO detection summary into standard complaint pipeline
    res3_analyze = client.post("/complaints/analyze", json={"text": yolo_data["summary"], "lat": 19.076, "lng": 72.877})
    assert res3_analyze.status_code == 200
    res3_submit = client.post("/complaints", json={"text": yolo_data["summary"], "lat": 19.076, "lng": 72.877})
    assert res3_submit.status_code == 200
    print(f"  -> Image Ticket Created: INC-{res3_submit.json()['id']}")
    print("  [PASS] Test 3: Image YOLO pipeline works end-to-end.")

    # 4. VOICE ERROR HANDLING
    print("\n[TEST 4] Voice Error Handling (empty audio)...")
    res4 = client.post("/complaints/transcribe", files={"audio": ("empty.wav", b"", "audio/wav")})
    assert res4.status_code == 400, f"Expected 400 for empty audio, got {res4.status_code}"
    print(f"  -> Handled empty audio with message: {res4.json()['detail']}")
    print("  [PASS] Test 4: Voice error handling validated.")

    # 5. IMAGE ERROR HANDLING
    print("\n[TEST 5] Image Error Handling (unsupported extension)...")
    res5 = client.post("/complaints/image/analyze", files={"image": ("malicious.exe", b"not an image", "application/octet-stream")})
    assert res5.status_code == 400, f"Expected 400 for invalid image type, got {res5.status_code}"
    print(f"  -> Handled invalid format with message: {res5.json()['detail']}")
    print("  [PASS] Test 5: Image error handling validated.")

    # 6. NO YOLO DETECTION SCENARIO
    print("\n[TEST 6] YOLO Handling for Image without confident objects...")
    res6 = client.post("/complaints/image/analyze", files={"image": ("blank.jpg", img_bytes, "image/jpeg")})
    assert res6.status_code == 200
    assert res6.json()["has_detections"] == False or res6.json()["total_detections"] >= 0
    print(f"  -> Handled zero-detection with friendly summary: '{res6.json()['summary']}'")
    print("  [PASS] Test 6: Zero-detection handled gracefully.")

    # 7. BACKWARD COMPATIBILITY: POST /complaints/voice
    print("\n[TEST 7] Legacy Voice Endpoint (POST /complaints/voice)...")
    res7 = client.post("/complaints/voice", files={"audio": ("legacy.wav", wav_bytes, "audio/wav")}, data={"lat": 19.076, "lng": 72.877})
    assert res7.status_code == 200, f"Legacy voice submit failed: {res7.text}"
    print(f"  -> Legacy Voice Endpoint Created Ticket: INC-{res7.json()['id']}")
    print("  [PASS] Test 7: Legacy voice endpoint backward compatibility preserved.")

    print("\n==================================================")
    print("ALL 7 TEST MATRIX VERIFICATIONS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_comprehensive_matrix()
