from typing import List, Optional

from pydantic import BaseModel


class SearchRequest(BaseModel):
    text: str


class CompareRequest(BaseModel):
    profession1: str
    profession2: str


class CityStat(BaseModel):
    name: str
    count: int
    avg_salary: Optional[float] = None


class SkillStat(BaseModel):
    name: str
    count: int


class RegionStat(BaseModel):
    name: str
    count: int
    avg_salary: Optional[float] = None


class StatsResponse(BaseModel):
    query: str
    total: int
    avg_salary: Optional[float]
    salary_from: Optional[float]
    salary_to: Optional[float]
    top_cities_count: List[CityStat]
    top_cities_salary: List[CityStat]
    top_skills: List[SkillStat]
    regions: List[RegionStat]


class ProfessionCompare(BaseModel):
    query: str
    total: int
    avg_salary: Optional[float]
    top_cities: List[CityStat]
    top_skills: List[SkillStat]


class CompareResponse(BaseModel):
    profession1: ProfessionCompare
    profession2: ProfessionCompare
