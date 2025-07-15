from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from . import models, schemas

# Download Rules CRUD operations
async def create_download_rule(db: Session, rule: schemas.DownloadRuleCreate) -> models.DownloadRule:
    # Convert Pydantic URL to string for database storage
    rule_dict = rule.dict()
    rule_dict['rss_url'] = str(rule_dict['rss_url'])
    
    db_rule = models.DownloadRule(**rule_dict)
    db.add(db_rule)
    await db.commit()
    await db.refresh(db_rule)
    return db_rule

async def get_download_rule(db: Session, rule_id: int) -> models.DownloadRule | None:
    return await db.execute(
        select(models.DownloadRule).filter(models.DownloadRule.id == rule_id)
    ).scalar_one_or_none()

async def get_download_rules(db: Session, skip: int = 0, limit: int = 100) -> list[models.DownloadRule]:
    result = await db.execute(
        select(models.DownloadRule).offset(skip).limit(limit)
    )
    return result.scalars().all()

async def update_download_rule(
    db: Session, rule_id: int, rule: schemas.DownloadRuleCreate
) -> models.DownloadRule | None:
    db_rule = await get_download_rule(db, rule_id)
    if db_rule:
        rule_dict = rule.dict()
        rule_dict['rss_url'] = str(rule_dict['rss_url'])
        
        for key, value in rule_dict.items():
            setattr(db_rule, key, value)
        db_rule.last_updated = datetime.utcnow()
        await db.commit()
        await db.refresh(db_rule)
    return db_rule

async def delete_download_rule(db: Session, rule_id: int) -> bool:
    db_rule = await get_download_rule(db, rule_id)
    if db_rule:
        await db.delete(db_rule)
        await db.commit()
        return True
    return False

# Aria2 Config CRUD operations
async def get_aria2_config(db: Session) -> models.Aria2Config | None:
    result = await db.execute(select(models.Aria2Config))
    return result.scalar_one_or_none()

async def create_or_update_aria2_config(
    db: Session, config: schemas.Aria2ConfigCreate
) -> models.Aria2Config:
    db_config = await get_aria2_config(db)
    if db_config:
        for key, value in config.dict().items():
            setattr(db_config, key, value)
        db_config.last_updated = datetime.utcnow()
    else:
        db_config = models.Aria2Config(**config.dict())
        db.add(db_config)
    
    await db.commit()
    await db.refresh(db_config)
    return db_config
