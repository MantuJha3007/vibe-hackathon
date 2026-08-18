import asyncio
import os
import json
import re
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv("sentinel/backend/.env")

SYSTEM_PROMPT = """You are an AI assistant for a civic complaint management system.
Analyze the citizen's complaint and extract structured information.

Respond ONLY with a valid JSON object in this exact format:
{
  "category": "<one of: Pothole, Garbage, Streetlight, Water Supply, Sewage, Noise Pollution, Air Pollution, Road Damage, Tree Hazard, Illegal Construction, Industrial Waste, Other>",
  "severity": <integer 1-5, where 1=minor inconvenience, 3=significant issue, 5=emergency/health hazard>,
  "department": "<responsible government department>",
  "location": {
    "lat": <latitude as float, use 0.0 if unknown>,
    "lng": <longitude as float, use 0.0 if unknown>,
    "address": "<extracted address or landmark, empty string if none>"
  },
  "summary": "<one concise sentence summarizing the complaint>",
  "keywords": ["<tag1>", "<tag2>", "<tag3>"]
}
"""

async def test_json_triage(model_id):
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    prompt = "A large sewer pipe burst on MG Road near Metro Station gate 2, foul water overflowing and blocking traffic."
    
    print(f"\n--- Testing Model: {model_id} ---")
    try:
        resp = await client.chat.completions.create(
            model=model_id,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=512
        )
        content = resp.choices[0].message.content.strip()
        print("Raw Content:", content)
        
        # Parse JSON
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL)
        json_str = json_match.group(1) if json_match else content
        data = json.loads(json_str)
        print(f"PARSED JSON SUCCESS: Category={data.get('category')}, Severity={data.get('severity')}, Dept={data.get('department')}")
        return True
    except Exception as e:
        print("FAILED:", e)
        return False

async def main():
    for m in ["groq/compound-mini", "groq/compound", "allam-2-7b"]:
        await test_json_triage(m)

if __name__ == "__main__":
    asyncio.run(main())
