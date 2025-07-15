from sqlalchemy.orm import Session
from . import models, schemas

def get_rule(db: Session, rule_id: int):
    return db.query(models.Rule).filter(models.Rule.id == rule_id).first()

def get_rules(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Rule).offset(skip).limit(limit).all()

def create_rule(db: Session, rule: schemas.RuleCreate):
    db_rule = models.Rule(**rule.dict())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

def get_aria2_config(db: Session):
    return db.query(models.Aria2Config).first()

def create_or_update_aria2_config(db: Session, config: schemas.Aria2ConfigCreate):
    db_config = get_aria2_config(db)
    if db_config:
        for key, value in config.dict().items():
            setattr(db_config, key, value)
    else:
        db_config = models.Aria2Config(**config.dict())
        db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config
