import httpx
import time
from datetime import datetime

def test_location_matrix():
    client = httpx.Client(base_url="http://localhost:8000", timeout=30.0)

    print("==========================================================")
    print("RUNNING SENTINEL EXACT LOCATION DETECTION TEST SUITE")
    print("==========================================================")

    # 1. REVERSE GEOCODING TEST
    print("\n[TEST 1] Testing Backend Reverse Geocoding Endpoint...")
    # Mumbai coordinates near Gateway / Colaba
    lat, lng = 18.9220, 72.8347
    res_geo = client.get(f"/complaints/location/reverse-geocode?lat={lat}&lng={lng}")
    assert res_geo.status_code == 200, f"Geocode failed: {res_geo.text}"
    geo_data = res_geo.json()
    print(f"  -> Reverse Geocoded Address: '{geo_data.get('address')}'")
    assert geo_data.get("address") != "", "Address should not be empty"
    print("  [PASS] Test 1: Reverse Geocoding works.")

    # 2. COORDINATE VALIDATION
    print("\n[TEST 2] Testing Coordinate Bounds Validation...")
    # Invalid lat > 90
    res_bad_lat = client.post("/complaints/analyze", json={"text": "Road issue", "lat": 95.0, "lng": 72.0})
    assert res_bad_lat.status_code in [400, 422], f"Expected 400 for bad lat, got {res_bad_lat.status_code}"
    # Invalid lng < -180
    res_bad_lng = client.post("/complaints/analyze", json={"text": "Road issue", "lat": 19.0, "lng": -195.0})
    assert res_bad_lng.status_code in [400, 422], f"Expected 400 for bad lng, got {res_bad_lng.status_code}"
    print("  -> Correctly rejected out-of-bounds coordinates.")
    print("  [PASS] Test 2: Coordinate validation works.")

    # 3. GPS LOCATION COMPLAINT SUBMISSION (SOURCE: GPS)
    print("\n[TEST 3] GPS Location Complaint Submission...")
    ts_now = datetime.now().isoformat()
    complaint_gps = {
        "text": "Deep pothole causing accidents outside college gate",
        "lat": 19.123456,
        "lng": 72.834567,
        "location_accuracy": 8.5,
        "location_source": "gps",
        "location_timestamp": ts_now,
    }
    res_gps = client.post("/complaints", json=complaint_gps)
    assert res_gps.status_code == 200, f"Submit failed: {res_gps.text}"
    ticket_gps = res_gps.json()
    print(f"  -> Ticket ID: INC-{ticket_gps['id']}")
    print(f"  -> Address: {ticket_gps['address']}")
    print(f"  -> Lat/Lng: {ticket_gps['lat']}, {ticket_gps['lng']}")
    print(f"  -> Accuracy: ±{ticket_gps.get('location_accuracy')} m")
    print(f"  -> Source: {ticket_gps.get('location_source')}")
    assert ticket_gps["lat"] == 19.123456
    assert ticket_gps["lng"] == 72.834567
    assert ticket_gps["location_accuracy"] == 8.5
    assert ticket_gps["location_source"] == "gps"
    print("  [PASS] Test 3: GPS Ticket created with accurate metadata.")

    # 4. MANUAL / ADJUSTED MAP PIN SUBMISSION (SOURCE: GPS_ADJUSTED)
    print("\n[TEST 4] Manual / Map-Adjusted Complaint Submission...")
    complaint_adjusted = {
        "text": "Broken street light near street corner",
        "lat": 19.130000,
        "lng": 72.840000,
        "address": "SV Road, Andheri West, Mumbai",
        "location_accuracy": 5.0,
        "location_source": "gps_adjusted",
        "location_timestamp": ts_now,
    }
    res_adj = client.post("/complaints", json=complaint_adjusted)
    assert res_adj.status_code == 200
    ticket_adj = res_adj.json()
    print(f"  -> Ticket ID: INC-{ticket_adj['id']}")
    print(f"  -> Source: {ticket_adj.get('location_source')}")
    assert ticket_adj["location_source"] == "gps_adjusted"
    assert ticket_adj["address"] == "SV Road, Andheri West, Mumbai"
    print("  [PASS] Test 4: Adjusted location saved properly.")

    # 5. DEDUPLICATION: TWO COMPLAINTS WITHIN 200m (SAME CATEGORY)
    print("\n[TEST 5] Deduplication: Incident within ~50 meters...")
    # Point 1: 19.0800, 72.8500
    res_orig = client.post("/complaints", json={
        "text": "Severe garbage accumulation at market junction",
        "lat": 19.080000,
        "lng": 72.850000,
        "location_accuracy": 10.0,
    })
    assert res_orig.status_code == 200
    orig_id = res_orig.json()["id"]
    print(f"  -> Original Ticket ID: INC-{orig_id} (Report Count: {res_orig.json()['report_count']})")

    # Point 2: ~45 meters away (delta lat ~0.0004)
    res_dup = client.post("/complaints", json={
        "text": "Large pile of waste on market corner",
        "lat": 19.080400,
        "lng": 72.850000,
        "location_accuracy": 12.0,
    })
    assert res_dup.status_code == 200
    dup_data = res_dup.json()
    print(f"  -> Duplicate Response Ticket ID: INC-{dup_data['id']}")
    print(f"  -> is_duplicate: {dup_data['is_duplicate']}")
    print(f"  -> duplicate_distance_meters: {dup_data.get('duplicate_distance_meters')} m")
    print(f"  -> Updated Report Count: {dup_data['report_count']}")
    assert dup_data["is_duplicate"] == True
    assert dup_data["id"] == orig_id
    assert dup_data["duplicate_distance_meters"] is not None
    assert 30 <= dup_data["duplicate_distance_meters"] <= 60
    print("  [PASS] Test 5: Deduplication matched within 200m with distance returned.")

    # 6. SEPARATE TICKETS: TWO COMPLAINTS > 200m APART
    print("\n[TEST 6] Separate Tickets: Incidents > 200 meters apart...")
    # Point 3: 19.0900, 72.8500 (~1.1 km away)
    res_far = client.post("/complaints", json={
        "text": "Garbage dump near north station",
        "lat": 19.090000,
        "lng": 72.850000,
        "location_accuracy": 10.0,
    })
    assert res_far.status_code == 200
    far_data = res_far.json()
    print(f"  -> Far Incident Ticket ID: INC-{far_data['id']}")
    print(f"  -> is_duplicate: {far_data['is_duplicate']}")
    assert far_data["is_duplicate"] == False
    assert far_data["id"] != orig_id
    print("  [PASS] Test 6: Separate tickets created for points > 200m apart.")

    # 7. ADMIN TICKET RETRIEVAL & MAP VERIFICATION
    print("\n[TEST 7] Admin Ticket Fetch with Location Fields...")
    res_ticket = client.get(f"/tickets/{ticket_gps['id']}")
    assert res_ticket.status_code == 200
    admin_ticket = res_ticket.json()
    print(f"  -> Admin Fetched Ticket INC-{admin_ticket['id']}")
    print(f"  -> Lat: {admin_ticket['lat']}, Lng: {admin_ticket['lng']}")
    print(f"  -> Accuracy: ±{admin_ticket.get('location_accuracy')} m")
    print(f"  -> Source: {admin_ticket.get('location_source')}")
    assert admin_ticket["lat"] == ticket_gps["lat"]
    assert admin_ticket["location_accuracy"] == 8.5
    print("  [PASS] Test 7: Admin API delivers full location metadata.")

    print("\n==========================================================")
    print("ALL LOCATION & DEDUPLICATION TEST CASES PASSED!")
    print("==========================================================")

if __name__ == "__main__":
    test_location_matrix()
