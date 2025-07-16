from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

import crud
import models
import schemas
from database import SessionLocal, engine
from scheduler import scheduler

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.on_event("startup")
def startup_event():
    scheduler.start()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/rules/", response_model=schemas.Rule)
def create_rule(rule: schemas.RuleCreate, db: Session = Depends(get_db)):
    return crud.create_rule(db=db, rule=rule)


@app.get("/rules/", response_model=list[schemas.Rule])
def read_rules(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    rules = crud.get_rules(db, skip=skip, limit=limit)
    return rules


@app.get("/rules/{rule_id}", response_model=schemas.Rule)
def read_rule(rule_id: int, db: Session = Depends(get_db)):
    db_rule = crud.get_rule(db, rule_id=rule_id)
    if db_rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    return db_rule


@app.post("/aria2_config/", response_model=schemas.Aria2Config)
def create_or_update_aria2_config(
    config: schemas.Aria2ConfigCreate, db: Session = Depends(get_db)
):
    return crud.create_or_update_aria2_config(db=db, config=config)


@app.get("/aria2_config/", response_model=schemas.Aria2Config)
def read_aria2_config(db: Session = Depends(get_db)):
    config = crud.get_aria2_config(db)
    if config is None:
        raise HTTPException(status_code=404, detail="Aria2 config not found")
    return config
