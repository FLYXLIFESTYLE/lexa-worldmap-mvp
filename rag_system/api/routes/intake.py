"""
Intake pipeline endpoints (private-by-default drafts -> review -> publish).

This router is designed to be called by a trusted server-side proxy (Next.js API routes)
and guarded by an admin token, so we can keep secrets off the browser.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Header
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional, Literal, Tuple
import re
import uuid
import structlog
import httpx
from datetime import datetime, timezone
from urllib.parse import urlparse, urljoin

from config.settings import settings
from database.neo4j_client import neo4j_client
from database.account_manager import account_manager
from core.llm.router import extract_json as llm_extract_json, ocr_and_extract_json as llm_ocr_json

logger = structlog.get_logger()
router = APIRouter()


def _require_admin_token(x_lexa_admin_token: Optional[str]) -> None:
    expected = getattr(settings, "lexa_admin_token", None)
    # If not configured, we allow calls (useful for local dev). In production, set LEXA_ADMIN_TOKEN.
    if expected and x_lexa_admin_token != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _supabase():
    if account_manager is None:
        raise HTTPException(status_code=503, detail="Supabase not initialized")
    return account_manager.supabase


def _norm_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def _extract_links(html: str, base_url: str, max_links: int = 30) -> List[str]:
    links: List[str] = []
    hrefs = re.findall(r'<a[^>]+href=["\']([^"\']+)["\']', html, flags=re.IGNORECASE)
    base = urlparse(base_url)
    for href in hrefs:
        if href.startswith("#") or href.startswith("mailto:") or href.startswith("tel:") or href.startswith("javascript:"):
            continue
        try:
            absolute = urljoin(base_url, href)
            u = urlparse(absolute)
            if u.scheme not in ("http", "https"):
                continue
            if u.hostname != base.hostname:
                continue
            if absolute not in links:
                links.append(absolute)
            if len(links) >= max_links:
                break
        except Exception:
            continue
    return links


def _guess_source_type(filename: Optional[str], content_type: Optional[str]) -> str:
    ct = (content_type or "").lower()
    name = (filename or "").lower()
    if ct.startswith("image/") or name.endswith((".png", ".jpg", ".jpeg")):
        return "image"
    if ct.startswith("text/") or name.endswith((".txt", ".md", ".csv", ".json")):
        return "text"
    if name.endswith((".pdf", ".doc", ".docx", ".xls", ".xlsx")):
        return "document"
    return "other"


class ScreenRequest(BaseModel):
    upload_id: str
    url: Optional[str] = None


class ExtractDraftRequest(BaseModel):
    upload_id: str
    # for text/url types, client can pass the content to avoid refetching
    text: Optional[str] = None
    # extraction knobs
    include_geo: bool = True
    include_knowledge: bool = True
    include_chunks: bool = True
    crawl_subpages: bool = False
    crawl_limit: int = Field(default=5, ge=1, le=20)


class PublishRequest(BaseModel):
    upload_id: str
    # uploader identity is used for draft ownership and audit (not projected into Neo4j)
    uploader_user_id: str


@router.post("/intake/upload")
async def intake_upload(
    x_lexa_admin_token: Optional[str] = Header(default=None),
    uploader_user_id: str = Form(..., description="Supabase auth user.id (captain/uploader)"),
    keep_raw: bool = Form(default=False),
    source_type: Optional[str] = Form(default=None),
    source_name: Optional[str] = Form(default=None),
    title: Optional[str] = Form(default=None),
    url: Optional[str] = Form(default=None),
    text: Optional[str] = Form(default=None),
    file: Optional[UploadFile] = File(default=None),
):
    """
    Create a private intake upload (file/url/text/image) and return its upload_id.
    """
    _require_admin_token(x_lexa_admin_token)

    if not uploader_user_id:
        raise HTTPException(status_code=400, detail="uploader_user_id is required")

    if not (file or url or text):
        raise HTTPException(status_code=400, detail="Provide one of: file, url, text")

    detected_source_type = source_type or ("url" if url else _guess_source_type(getattr(file, "filename", None), getattr(file, "content_type", None)))
    upload_id = str(uuid.uuid4())

    # Images must be stored (keep_raw=true) so OCR can be performed later.
    if detected_source_type == "image" and not keep_raw:
        raise HTTPException(
            status_code=400,
            detail="For images, set keep_raw=true so LEXA can run OCR during extraction."
        )

    # Store minimal record now. Raw content is handled separately.
    record: Dict[str, Any] = {
        "id": upload_id,
        "uploaded_by_user_id": uploader_user_id,
        "status": "uploaded",
        "keep_raw": bool(keep_raw),
        "source_type": detected_source_type,
        "source_name": source_name or (file.filename if file else None) or (url if url else None),
        "title": title,
        "source_url": url,
        "metadata": {
            "file_name": getattr(file, "filename", None),
            "file_content_type": getattr(file, "content_type", None),
        },
    }

    raw_text: Optional[str] = None
    raw_bytes: Optional[bytes] = None

    if text:
        raw_text = _norm_text(text)
    elif url:
        # we store the URL; content will be fetched at screen/extract stage
        raw_text = None
    elif file:
        raw_bytes = await file.read()
        # If it's text-like, also persist decoded text for extraction convenience
        if detected_source_type == "text":
            try:
                raw_text = raw_bytes.decode("utf-8", errors="ignore")
            except Exception:
                raw_text = None

    # Insert upload
    try:
        res = _supabase().table("intake_uploads").insert(record).execute()
        if not res.data:
            raise Exception("Insert returned no data")
    except Exception as e:
        logger.error("Failed to create intake_uploads row", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to create upload: {str(e)}")

    # Store raw content (best effort)
    storage_path = None
    try:
        if keep_raw and raw_bytes is not None:
            # Use a private bucket (recommended). If not present, this will fail gracefully.
            bucket = getattr(settings, "intake_storage_bucket", "intake-uploads")
            storage_path = f"{uploader_user_id}/{upload_id}/{file.filename}"
            _supabase().storage.from_(bucket).upload(storage_path, raw_bytes)  # type: ignore
        elif raw_text is not None:
            # store text in drafts table later; for now attach to upload metadata to keep MVP simple
            _supabase().table("intake_uploads").update({"raw_text": raw_text}).eq("id", upload_id).execute()
    except Exception as e:
        logger.warning("Raw content persistence skipped", error=str(e), upload_id=upload_id)

    if storage_path:
        try:
            _supabase().table("intake_uploads").update({"storage_path": storage_path}).eq("id", upload_id).execute()
        except Exception:
            pass

    return {"upload_id": upload_id, "source_type": detected_source_type, "status": "uploaded"}


@router.post("/intake/screen")
async def intake_screen(
    request: ScreenRequest,
    x_lexa_admin_token: Optional[str] = Header(default=None),
):
    """
    Screen/classify an upload and (for URLs) discover subpages.
    Returns a recommended extraction plan for the UI to preview.
    """
    _require_admin_token(x_lexa_admin_token)

    try:
        row = _supabase().table("intake_uploads").select("*").eq("id", request.upload_id).execute()
        if not row.data:
            raise HTTPException(status_code=404, detail="Upload not found")
        upload = row.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load upload: {str(e)}")

    url = request.url or upload.get("source_url")
    subpages: List[str] = []
    title: Optional[str] = upload.get("title")
    content_preview: Optional[str] = None

    if url:
        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                resp = await client.get(url, headers={"User-Agent": "LEXA/1.0"})
                resp.raise_for_status()
                html = resp.text
                subpages = _extract_links(html, url, max_links=30)
                m = re.search(r"<title[^>]*>([^<]+)</title>", html, flags=re.IGNORECASE)
                if m and not title:
                    title = _norm_text(m.group(1))
                # very rough main text preview
                text = re.sub(r"<script[\\s\\S]*?</script>", " ", html, flags=re.IGNORECASE)
                text = re.sub(r"<style[\\s\\S]*?</style>", " ", text, flags=re.IGNORECASE)
                text = re.sub(r"<[^>]+>", " ", text)
                text = _norm_text(text)
                content_preview = text[:800]
        except Exception as e:
            logger.warning("URL fetch failed during screening", error=str(e), url=url)

    st = upload.get("source_type", "other")
    recommended = {
        "geo_planning": st in ("text", "image", "document", "other"),
        "market_knowledge": st in ("text", "document", "other") or bool(url),
        "ocr": st == "image",
        "crawl_subpages": bool(url) and len(subpages) > 0,
    }

    try:
        _supabase().table("intake_uploads").update({
            "status": "screened",
            "title": title,
            "screening": {
                "url": url,
                "subpages": subpages,
                "recommended": recommended,
            },
        }).eq("id", request.upload_id).execute()
    except Exception:
        # not critical
        pass

    return {
        "upload_id": request.upload_id,
        "title": title,
        "source_type": st,
        "url": url,
        "subpages": subpages,
        "content_preview": content_preview,
        "recommended": recommended,
    }


async def _claude_extract_from_text(text: str) -> Dict[str, Any]:
    """
    Extract entities/relations/knowledge and unstructured chunks with failover:
    Anthropic (primary) -> OpenAI (fallback) -> heuristic fallback.
    """
    system = (
        "You are an expert luxury travel knowledge extractor.\n"
        "Return JSON only. Extract:\n"
        "- entities.pois: list of {name,type,destination,lat,lon,description,confidence}\n"
        "- entities.destinations: list of {name,confidence}\n"
        "- relations: list of {from,to,type,confidence,evidence}\n"
        "- knowledge: list of {topic,content,applies_to,confidence,tags}\n"
        "- chunks: list of {chunk,purpose,source_span}\n"
        "Be conservative with confidence. Keep names as written.\n"
    )

    return await llm_extract_json(system=system, user_text=text, max_tokens=2500, prefer=settings.default_llm)


async def _claude_ocr_image(image_bytes: bytes, media_type: str = "image/png") -> Dict[str, Any]:
    """
    OCR + extraction with failover:
    Anthropic vision (primary) -> OpenAI vision (fallback) -> pending payload.
    """
    system = (
        "You are an OCR + extractor for luxury travel screenshots.\n"
        "Return JSON only with keys:\n"
        "- ocr_text: string\n"
        "- entities, relations, knowledge, chunks (same schema as text extraction)\n"
        "Prefer correct place names; if uncertain, lower confidence.\n"
    )
    return await llm_ocr_json(system=system, image_bytes=image_bytes, max_tokens=2500, prefer=settings.default_llm, media_type=media_type)


@router.post("/intake/extract-draft")
async def intake_extract_draft(
    request: ExtractDraftRequest,
    x_lexa_admin_token: Optional[str] = Header(default=None),
):
    """
    Produce a draft extraction payload for review, and store it in Supabase.
    """
    _require_admin_token(x_lexa_admin_token)

    # Load upload
    row = _supabase().table("intake_uploads").select("*").eq("id", request.upload_id).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Upload not found")
    upload = row.data[0]

    st = upload.get("source_type", "other")
    extracted: Dict[str, Any] = {}

    try:
        if st == "image":
            # If raw bytes were not stored, we can't OCR; require caller to pass the image as text is not possible.
            # MVP: store image bytes in drafts by having caller re-upload or keep_raw in storage.
            # Here we try to load from storage_path if available.
            storage_path = upload.get("storage_path")
            if not storage_path:
                raise HTTPException(status_code=400, detail="Image OCR requires keep_raw=true so the image can be read during extraction")

            bucket = getattr(settings, "intake_storage_bucket", "intake-uploads")
            # supabase-py storage download returns bytes-like or a response object; handle best effort
            data = _supabase().storage.from_(bucket).download(storage_path)  # type: ignore
            image_bytes = data if isinstance(data, (bytes, bytearray)) else getattr(data, "data", None)
            if not image_bytes:
                raise HTTPException(status_code=500, detail="Failed to download image bytes for OCR")
            meta = upload.get("metadata") or {}
            media_type = meta.get("file_content_type") or "image/png"
            extracted = await _claude_ocr_image(bytes(image_bytes), media_type=media_type)
        else:
            text = request.text or upload.get("raw_text")
            if not text and upload.get("source_url"):
                # fetch URL content (single page)
                async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
                    resp = await client.get(upload["source_url"], headers={"User-Agent": "LEXA/1.0"})
                    resp.raise_for_status()
                    html = resp.text
                    text = re.sub(r"<script[\\s\\S]*?</script>", " ", html, flags=re.IGNORECASE)
                    text = re.sub(r"<style[\\s\\S]*?</style>", " ", text, flags=re.IGNORECASE)
                    text = re.sub(r"<[^>]+>", " ", text)
                    text = _norm_text(text)

            # Optional crawl of discovered subpages (domain-limited)
            if upload.get("source_url") and request.crawl_subpages:
                try:
                    screening = upload.get("screening") or {}
                    subpages = screening.get("subpages") or []
                    if subpages:
                        from core.intake.web_crawler import crawl_and_combine_text
                        combined = await crawl_and_combine_text(
                            start_url=upload["source_url"],
                            discovered_urls=subpages,
                            max_pages=int(request.crawl_limit),
                        )
                        if combined:
                            text = f"{text or ''}\n\n=== SUBPAGES (CRAWLED) ===\n\n{combined}".strip()
                except Exception as e:
                    logger.warning("Subpage crawl failed; continuing with main page only", error=str(e))

            if not text:
                raise HTTPException(status_code=400, detail="No text available for extraction")

            extracted = await _claude_extract_from_text(text)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Draft extraction failed", error=str(e), upload_id=request.upload_id)
        raise HTTPException(status_code=500, detail=f"Draft extraction failed: {str(e)}")

    draft_id = str(uuid.uuid4())
    draft = {
        "id": draft_id,
        "upload_id": request.upload_id,
        "status": "extracted",
        "extracted": extracted,
        "user_edits": {},
        "verified": {},
    }

    try:
        _supabase().table("intake_drafts").insert(draft).execute()
        _supabase().table("intake_uploads").update({"status": "extracted", "draft_id": draft_id}).eq("id", request.upload_id).execute()
    except Exception as e:
        logger.warning("Failed to persist draft (tables may be missing)", error=str(e))

    return {"upload_id": request.upload_id, "draft_id": draft_id, "extracted": extracted}


async def _publish_to_neo4j(extracted: Dict[str, Any], source_upload_id: str) -> Dict[str, int]:
    """
    Minimal publish: upsert destinations + pois + relations + knowledge nodes.
    Uses lowercase relationship types to stay compatible with existing POI editor queries.
    """
    stats = {"pois_upserted": 0, "relations_created": 0, "knowledge_created": 0}

    entities = extracted.get("entities") or {}
    pois = entities.get("pois") or []
    destinations = entities.get("destinations") or []
    relations = extracted.get("relations") or []
    knowledge = extracted.get("knowledge") or []

    # Destinations
    for d in destinations:
        name = (d or {}).get("name")
        if not name:
            continue
        await neo4j_client.execute_query(
            "MERGE (d:destination {name: $name}) SET d.updated_at = datetime() RETURN d",
            {"name": name},
        )

    # POIs
    for p in pois:
        name = (p or {}).get("name")
        if not name:
            continue
        poi_uid = f"intake:{source_upload_id}:{uuid.uuid4()}"
        await neo4j_client.execute_query(
            """
            MERGE (p:poi {name: $name})
            ON CREATE SET p.poi_uid = $poi_uid, p.source = 'intake', p.source_id = $source_id, p.created_at = datetime()
            SET p.type = coalesce(p.type, $type),
                p.description = coalesce(p.description, $description),
                p.updated_at = datetime()
            RETURN p
            """,
            {
                "name": name,
                "poi_uid": poi_uid,
                "source_id": source_upload_id,
                "type": (p or {}).get("type"),
                "description": (p or {}).get("description"),
            },
        )
        stats["pois_upserted"] += 1

        dest = (p or {}).get("destination")
        if dest:
            await neo4j_client.execute_query(
                """
                MATCH (p:poi {name: $poi})
                MERGE (d:destination {name: $dest})
                MERGE (p)-[:located_in]->(d)
                RETURN p,d
                """,
                {"poi": name, "dest": dest},
            )
            stats["relations_created"] += 1

    # Generic relations
    for r in relations:
        frm = (r or {}).get("from")
        to = (r or {}).get("to")
        rtype = ((r or {}).get("type") or "").lower()
        if not frm or not to or not rtype:
            continue

        # map common types
        rel_type = {
            "located_in": "located_in",
            "has_theme": "has_theme",
            "supports_activity": "supports_activity",
            "evokes": "evokes",
        }.get(rtype, rtype)

        # choose target label
        target_label = "Entity"
        if rel_type == "located_in":
            target_label = "destination"
        elif rel_type == "has_theme":
            target_label = "theme"
        elif rel_type == "supports_activity":
            target_label = "activity_type"
        elif rel_type == "evokes":
            target_label = "Emotion"

        await neo4j_client.execute_query(
            f"""
            MATCH (p:poi {{name: $from}})
            MERGE (t:{target_label} {{name: $to}})
            MERGE (p)-[r:{rel_type}]->(t)
            SET r.source = 'intake', r.source_id = $source_id, r.updated_at = datetime()
            RETURN r
            """,
            {"from": frm, "to": to, "source_id": source_upload_id},
        )
        stats["relations_created"] += 1

    # Knowledge
    for k in knowledge:
        content = (k or {}).get("content")
        topic = (k or {}).get("topic") or "Insight"
        if not content:
            continue
        knowledge_id = str(uuid.uuid4())
        await neo4j_client.execute_query(
            """
            CREATE (k:Knowledge {
              knowledge_id: $kid,
              topic: $topic,
              content: $content,
              confidence: $confidence,
              tags: $tags,
              source: 'intake',
              source_id: $source_id,
              created_at: datetime(),
              verified: false
            })
            RETURN k
            """,
            {
                "kid": knowledge_id,
                "topic": topic,
                "content": content,
                "confidence": float((k or {}).get("confidence") or 0.7),
                "tags": (k or {}).get("tags") or [],
                "source_id": source_upload_id,
            },
        )
        stats["knowledge_created"] += 1

    return stats


def _store_rag_chunks(upload_id: str, chunks: List[Dict[str, Any]]) -> int:
    """
    Store chunks for later embedding. Embeddings are generated later by a job.
    """
    if not chunks:
        return 0

    rows = []
    for c in chunks:
        chunk = (c or {}).get("chunk")
        if not chunk:
            continue
        rows.append({
            "id": str(uuid.uuid4()),
            "upload_id": upload_id,
            "text": chunk,
            "metadata": {k: v for k, v in (c or {}).items() if k != "chunk"},
            "embedding": None,
        })

    if not rows:
        return 0

    _supabase().table("rag_chunks").insert(rows).execute()
    return len(rows)


@router.post("/intake/publish")
async def intake_publish(
    request: PublishRequest,
    x_lexa_admin_token: Optional[str] = Header(default=None),
):
    """
    Publish a previously extracted draft:
    - Neo4j: POIs, relations, Knowledge
    - Supabase: store unstructured chunks for later embeddings
    """
    _require_admin_token(x_lexa_admin_token)

    # Load upload + draft
    row = _supabase().table("intake_uploads").select("*").eq("id", request.upload_id).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Upload not found")
    upload = row.data[0]

    draft_id = upload.get("draft_id")
    if not draft_id:
        raise HTTPException(status_code=400, detail="Upload has no extracted draft to publish")

    drow = _supabase().table("intake_drafts").select("*").eq("id", draft_id).execute()
    if not drow.data:
        raise HTTPException(status_code=404, detail="Draft not found")
    draft = drow.data[0]
    extracted = draft.get("extracted") or {}

    # Publish
    stats = await _publish_to_neo4j(extracted, source_upload_id=request.upload_id)

    chunks = extracted.get("chunks") or []
    rag_count = 0
    try:
        rag_count = _store_rag_chunks(request.upload_id, chunks)
    except Exception as e:
        logger.warning("Failed to store rag chunks (table may be missing)", error=str(e))

    # Mark published
    try:
        published_at = datetime.now(timezone.utc).isoformat()
        _supabase().table("intake_uploads").update({
            "status": "published",
            "published_at": published_at,
        }).eq("id", request.upload_id).execute()
        _supabase().table("intake_drafts").update({"status": "published"}).eq("id", draft_id).execute()
    except Exception:
        pass

    return {"upload_id": request.upload_id, "neo4j": stats, "rag_chunks_stored": rag_count, "status": "published"}


@router.delete("/intake/raw/{upload_id}")
async def intake_delete_raw(
    upload_id: str,
    x_lexa_admin_token: Optional[str] = Header(default=None),
):
    _require_admin_token(x_lexa_admin_token)

    row = _supabase().table("intake_uploads").select("*").eq("id", upload_id).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Upload not found")
    upload = row.data[0]

    storage_path = upload.get("storage_path")
    if not storage_path:
        return {"upload_id": upload_id, "deleted": False, "message": "No raw file stored"}

    bucket = getattr(settings, "intake_storage_bucket", "intake-uploads")
    try:
        _supabase().storage.from_(bucket).remove([storage_path])  # type: ignore
        _supabase().table("intake_uploads").update({"storage_path": None}).eq("id", upload_id).execute()
        return {"upload_id": upload_id, "deleted": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete raw: {str(e)}")


