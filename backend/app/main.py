from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, recs, users

Base.metadata.create_all(bind=engine)

app = FastAPI(title="recs API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://recs-nine.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(recs.router)
app.include_router(users.router)

@app.get("/")
def root():
    return {"message": "recs API is running"}