import os
import time
import requests

API_KEY = "mstrl_YcC0ep68Ith2cWldEi4lFcSjaN9xuuPw_36Xb7p"

URL = "https://api.mistral.ai/v1/chat/completions"


def test_api():
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "mistral-small-latest",
        "messages": [
            {
                "role": "user",
                "content": (
                    "Say hello and confirm you are working using just 5 words."
                ),
            }
        ],
        "temperature": 0.2,
    }

    print("Sending test request to Mistral API (with automatic retry)...")

    max_retries = 3
    backoff_time = 4  # Start with a 4-second wait on 429

    for attempt in range(1, max_retries + 1):
        try:
            response = requests.post(
                URL, headers=headers, json=payload, timeout=300
            )

            # Handle rate limit (429) gracefully
            if response.status_code == 429:
                print(
                    f"⚠️ Rate limited (429). Waiting {backoff_time}s before"
                    f" retry {attempt}/{max_retries}..."
                )
                time.sleep(backoff_time)
                backoff_time *= 2  # Double the wait time for next retry
                continue

            response.raise_for_status()

            data = response.json()
            answer = data["choices"][0]["message"]["content"].strip()

            print("\n✅ API Success! Response from Mistral:")
            print(answer)
            return

        except requests.exceptions.HTTPError as e:
            print(f"\n❌ HTTP Error: {e}")
            if e.response is not None:
                print("Details:", e.response.text)
            break
        except Exception as e:
            print(f"\n❌ An error occurred: {e}")
            break


if __name__ == "__main__":
    test_api()