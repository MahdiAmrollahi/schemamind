from google import genai


def list_gemini_models(api_key: str) -> list[dict]:
    """Fetch available Gemini models from Google AI Studio.

    Returns models that support `generateContent` and have 'gemini' in their name.
    """
    client = genai.Client(api_key=api_key)
    models = []
    for m in client.models.list():
        actions = getattr(m, "supported_actions", None) or []
        if "generateContent" not in actions:
            continue
        name = m.name.replace("models/", "")
        if "gemini" not in name.lower():
            continue
        display = name.split("/")[-1].replace("-", " ").replace("_", " ").title()
        models.append({"id": name, "name": display})
    models.sort(key=lambda x: x["id"])
    return models
