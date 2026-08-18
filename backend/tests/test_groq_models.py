import asyncio
import os
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv("sentinel/backend/.env")

async def main():
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    models = await client.models.list()
    print("All available models for this key:")
    for m in models.data:
        print(" -", m.id)
        
    print("\nTesting chat completion on each model...")
    for m in models.data:
        if "whisper" in m.id or "guard" in m.id or "orpheus" in m.id:
            continue
        try:
            resp = await client.chat.completions.create(
                model=m.id,
                messages=[{"role": "user", "content": "Explain civic issue in 1 line."}],
                max_tokens=50
            )
            print(f"PASS: {m.id} -> {resp.choices[0].message.content.strip()[:80]}")
        except Exception as e:
            print(f"FAIL: {m.id} -> {e}")

if __name__ == "__main__":
    asyncio.run(main())
