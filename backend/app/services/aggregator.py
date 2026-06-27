from collections import Counter, defaultdict


def _salary_value(v: dict) -> float | None:
    s = v.get('salary')
    if not s:
        return None
    if s.get('from') and s.get('to'):
        return (s['from'] + s['to']) / 2
    return s.get('from') or s.get('to')


def aggregate(items: list, query: str) -> dict:
    city_count = Counter()
    city_salary: dict[str, list[float]] = defaultdict(list)
    region_count = Counter()
    region_salary: dict[str, list[float]] = defaultdict(list)
    all_skills: Counter = Counter()
    all_salaries = []

    for v in items:
        city = v.get('area', {}).get('name', 'Неизвестно')
        region = v.get('area', {}).get('name', 'Неизвестно')

        city_count[city] += 1
        region_count[region] += 1

        for s in v.get('key_skills', []):
            name = s.get('name', '')
            if name:
                all_skills[name] += 1

        sv = _salary_value(v)
        if sv is not None:
            all_salaries.append(sv)
            city_salary[city].append(sv)
            region_salary[region].append(sv)

    avg_all = (
        round(sum(all_salaries) / len(all_salaries), 0)
        if all_salaries
        else None
    )
    salary_min = min(all_salaries) if all_salaries else None
    salary_max = max(all_salaries) if all_salaries else None

    top_cities_count = [
        {'name': n, 'count': c} for n, c in city_count.most_common(5)
    ]

    city_avg_salaries = {
        city: round(sum(sals) / len(sals), 0)
        for city, sals in city_salary.items()
    }
    top_cities_salary = [
        {'name': n, 'count': city_count[n], 'avg_salary': city_avg_salaries[n]}
        for n, _ in sorted(
            city_avg_salaries.items(), key=lambda x: x[1], reverse=True
        )[:5]
    ]

    top_skills = [
        {'name': n, 'count': c} for n, c in all_skills.most_common(15)
    ]

    region_avg = {}
    for region, sals in region_salary.items():
        region_avg[region] = round(sum(sals) / len(sals), 0)

    regions_data = []
    for region, count in region_count.most_common():
        regions_data.append(
            {
                'name': region,
                'count': count,
                'avg_salary': region_avg.get(region),
            }
        )

    return {
        'query': query,
        'total': len(items),
        'avg_salary': avg_all,
        'salary_from': salary_min,
        'salary_to': salary_max,
        'top_cities_count': top_cities_count,
        'top_cities_salary': top_cities_salary,
        'top_skills': top_skills,
        'regions': regions_data,
    }


def aggregate_compare(items: list, query: str) -> dict:
    city_count = Counter()
    skills = Counter()
    all_salaries = []

    for v in items:
        city = v.get('area', {}).get('name', 'Неизвестно')
        city_count[city] += 1
        for s in v.get('key_skills', []):
            name = s.get('name', '')
            if name:
                skills[name] += 1
        sv = _salary_value(v)
        if sv is not None:
            all_salaries.append(sv)

    avg = (
        round(sum(all_salaries) / len(all_salaries), 0)
        if all_salaries
        else None
    )
    top_cities = [
        {'name': n, 'count': c} for n, c in city_count.most_common(5)
    ]
    top_skills = [{'name': n, 'count': c} for n, c in skills.most_common(10)]

    return {
        'query': query,
        'total': len(items),
        'avg_salary': avg,
        'top_cities': top_cities,
        'top_skills': top_skills,
    }
