import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api.search import router as search_router

app = FastAPI(title='JobStat')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)
app.include_router(search_router)


@app.get('/health')
def health():
    return {'status': 'ok'}


frontend_dir = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'frontend'
)
if os.path.isdir(frontend_dir):
    app.mount(
        '/', StaticFiles(directory=frontend_dir, html=True), name='frontend'
    )
