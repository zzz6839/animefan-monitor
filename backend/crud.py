from sqlalchemy.orm import Session
import schemas
from database import Rule, Aria2Config
import logging

logger = logging.getLogger(__name__)

def get_rule(db: Session, rule_id: int):
    return db.query(Rule).filter(Rule.id == rule_id).first()

def get_rules(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Rule).offset(skip).limit(limit).all()

def create_rule(db: Session, rule: schemas.RuleCreate):
    db_rule = Rule(**rule.dict())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    logger.info(f"Created rule: {db_rule.name}")
    return db_rule

def update_rule(db: Session, rule_id: int, rule: schemas.RuleCreate):
    db_rule = get_rule(db, rule_id)
    if db_rule:
        for key, value in rule.dict().items():
            setattr(db_rule, key, value)
        db.commit()
        db.refresh(db_rule)
        logger.info(f"Updated rule: {db_rule.name}")
    return db_rule

def delete_rule(db: Session, rule_id: int):
    db_rule = get_rule(db, rule_id)
    if db_rule:
        db.delete(db_rule)
        db.commit()
        logger.info(f"Deleted rule: {db_rule.name}")
        return True
    return False

def toggle_rule(db: Session, rule_id: int):
    db_rule = get_rule(db, rule_id)
    if db_rule:
        db_rule.enabled = not db_rule.enabled
        db.commit()
        db.refresh(db_rule)
        logger.info(f"Toggled rule {db_rule.name} to {'enabled' if db_rule.enabled else 'disabled'}")
    return db_rule

def get_aria2_config(db: Session):
    return db.query(Aria2Config).first()

def create_or_update_aria2_config(db: Session, config: schemas.Aria2ConfigCreate):
    db_config = get_aria2_config(db)
    if db_config:
        for key, value in config.dict().items():
            setattr(db_config, key, value)
        logger.info("Updated Aria2 config")
    else:
        db_config = Aria2Config(**config.dict())
        db.add(db_config)
        logger.info("Created Aria2 config")
    db.commit()
    db.refresh(db_config)
    return db_config
