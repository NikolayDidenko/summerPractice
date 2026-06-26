import httpx
import asyncio
from ..config import HH_ACCESS_TOKEN, HH_API_URL, DELAY, MAX_PAGES, USE_MOCK

HEADERS = {
    "User-Agent": "JobStat/1.0 (research project)",
    "Accept": "application/json",
}

AREA_RUSSIA = "113"

AUTH_HEADERS = {**HEADERS, "Authorization": f"Bearer {HH_ACCESS_TOKEN}"}


def _map_vacancy(v: dict) -> dict:
    salary_raw = v.get("salary")
    salary = None
    if salary_raw and (salary_raw.get("from") or salary_raw.get("to")):
        salary = {
            "from": salary_raw.get("from"),
            "to": salary_raw.get("to"),
            "currency": salary_raw.get("currency", "RUR"),
            "gross": salary_raw.get("gross", False),
        }

    exp_raw = v.get("experience")
    if exp_raw:
        experience = {
            "id": exp_raw.get("id", "between1And3"),
            "name": exp_raw.get("name", "От 1 года до 3 лет"),
        }
    else:
        experience = {"id": "between1And3", "name": "От 1 года до 3 лет"}

    area = v.get("area", {})
    area_name = area.get("name", "Неизвестно") if isinstance(area, dict) else str(area)

    skills = [
        {"name": s["name"]}
        for s in v.get("key_skills", [])
        if s.get("name")
    ][:15]

    return {
        "id": v.get("id", ""),
        "name": v.get("name", "Неизвестно"),
        "area": {"name": area_name},
        "salary": salary,
        "experience": experience,
        "key_skills": skills,
    }


async def fetch_all(query: str) -> list:
    if USE_MOCK:
        return _mock_vacancies(query)

    all_items = []
    page = 0
    headers = AUTH_HEADERS

    async with httpx.AsyncClient(timeout=30) as client:
        while page < MAX_PAGES:
            try:
                resp = await client.get(
                    f"{HH_API_URL}/vacancies",
                    params={
                        "text": query,
                        "area": AREA_RUSSIA,
                        "per_page": 100,
                        "page": page,
                    },
                    headers=headers,
                )

                if resp.status_code == 401:
                    raise RuntimeError("Токен hh.ru недействителен. Обновите HH_ACCESS_TOKEN в config.py.")

                if resp.status_code == 403:
                    raise RuntimeError(
                        "API hh.ru временно недоступен (DDoS-Guard). Попробуйте позже."
                    )

                resp.raise_for_status()
                data = resp.json()
                items = data.get("items", [])

                if not items:
                    break

                all_items.extend(_map_vacancy(v) for v in items)

                found = data.get("found", 0)
                print(f"[HH.ru] Page {page}: got {len(items)} items, total found: {found}")

                page += 1

                if page * 100 >= found:
                    break

                await asyncio.sleep(DELAY)

            except httpx.ConnectError:
                raise RuntimeError("Не удалось подключиться к API hh.ru. Проверьте интернет.")
            except httpx.TimeoutException:
                raise RuntimeError("API hh.ru не ответил за отведённое время.")

    if not all_items:
        raise RuntimeError(f"По запросу «{query}» ничего не найдено.")

    return all_items


def _mock_vacancies(query: str) -> list:
    print(f"[Mock] Генерирую мок-данные для: {query}")
    return [
        {
            "id": str(i),
            "name": f"{query}",
            "area": {"name": "Москва" if i < 5 else "Санкт-Петербург" if i < 8 else "Новосибирск"},
            "salary": {"from": 60000 + i * 10000, "to": 120000 + i * 10000, "currency": "RUR", "gross": False},
            "experience": {"id": "between1And3", "name": "От 1 года до 3 лет"},
            "key_skills": [{"name": "Python"}, {"name": "Git"}, {"name": "SQL"}],
        }
        for i in range(1, 11)
    ]
