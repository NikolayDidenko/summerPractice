from fastapi import APIRouter, HTTPException
from ..models.schemas import SearchRequest, CompareRequest
from ..services import hh_client, aggregator

router = APIRouter(prefix="/api", tags=["search"])


@router.post("/search")
async def search(req: SearchRequest):
    if not req.text.strip():
        raise HTTPException(400, "Пустой запрос")
    try:
        items = await hh_client.fetch_all(req.text)
        return aggregator.aggregate(items, req.text)
    except Exception as e:
        raise HTTPException(500, f"Ошибка: {str(e)}")


@router.post("/compare")
async def compare(req: CompareRequest):
    if not req.profession1.strip() or not req.profession2.strip():
        raise HTTPException(400, "Введите обе профессии")
    try:
        items1, items2 = await hh_client.fetch_all(req.profession1), await hh_client.fetch_all(req.profession2)
        return {
            "profession1": aggregator.aggregate_compare(items1, req.profession1),
            "profession2": aggregator.aggregate_compare(items2, req.profession2),
        }
    except Exception as e:
        raise HTTPException(500, f"Ошибка: {str(e)}")
