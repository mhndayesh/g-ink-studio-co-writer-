"""Authoring-lifecycle coverage: revisions, reorder, search, notes, stats, and
idempotent approval.

All AI calls run on the deterministic fallback provider in tests.
"""
import pytest


async def _signup(client, email: str):
    r = await client.post("/v1/auth/signup", json={"email": email, "password": "password123", "display_name": "Writer"})
    assert r.status_code == 200, r.text
    token = r.json()["data"]["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _story(client, headers, title="Lifecycle"):
    r = await client.post("/v1/stories", json={"title": title, "genre": "Fantasy"}, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()["data"]["story"]["id"]


@pytest.mark.asyncio
async def test_chapter_revisions_and_restore(client):
    H = await _signup(client, "revisions@example.com")
    sid = await _story(client, H, "Revision Tale")

    r = await client.post(f"/v1/stories/{sid}/chapters", json={"title": "One", "content": "alpha beta"}, headers=H)
    assert r.status_code == 200, r.text
    chapter = r.json()["data"]["chapter"]
    assert chapter["word_count"] == 2

    r = await client.patch(f"/v1/stories/{sid}/chapters/{chapter['id']}", json={"content": "alpha beta gamma"}, headers=H)
    assert r.status_code == 200, r.text
    assert r.json()["data"]["chapter"]["word_count"] == 3

    r = await client.get(f"/v1/stories/{sid}/chapters/{chapter['id']}/revisions", headers=H)
    assert r.status_code == 200, r.text
    revs = r.json()["data"]["revisions"]
    assert revs
    assert any(rev["content"] == "alpha beta" for rev in revs)

    target = next(rev for rev in revs if rev["content"] == "alpha beta")
    r = await client.post(
        f"/v1/stories/{sid}/chapters/{chapter['id']}/revisions/{target['id']}/restore",
        headers=H,
    )
    assert r.status_code == 200, r.text
    assert r.json()["data"]["chapter"]["content"] == "alpha beta"


@pytest.mark.asyncio
async def test_chapter_reorder_and_unique_numbers(client):
    H = await _signup(client, "reorder@example.com")
    sid = await _story(client, H, "Order Tale")

    ids = []
    for n, title in enumerate(["One", "Two", "Three"], start=1):
        r = await client.post(f"/v1/stories/{sid}/chapters", json={"title": title, "content": title, "number": n}, headers=H)
        assert r.status_code == 200, r.text
        ids.append(r.json()["data"]["chapter"]["id"])

    # Duplicate number rejected
    r = await client.post(f"/v1/stories/{sid}/chapters", json={"title": "Dup", "number": 1}, headers=H)
    assert r.status_code == 409

    r = await client.put(f"/v1/stories/{sid}/chapters/order", json={"chapter_ids": list(reversed(ids))}, headers=H)
    assert r.status_code == 200, r.text

    r = await client.get(f"/v1/stories/{sid}/chapters", headers=H)
    chapters = r.json()["data"]["chapters"]
    assert [c["number"] for c in chapters] == [1, 2, 3]
    assert [c["title"] for c in chapters] == ["Three", "Two", "One"]


@pytest.mark.asyncio
async def test_search_notes_and_stats(client):
    H = await _signup(client, "search@example.com")
    sid = await _story(client, H, "Search Tale")

    r = await client.post(f"/v1/stories/{sid}/chapters", json={"title": "Moon", "content": "the silver fox waited"}, headers=H)
    assert r.status_code == 200

    r = await client.get(f"/v1/stories/{sid}/search?q=silver", headers=H)
    assert r.status_code == 200, r.text
    hits = r.json()["data"]["hits"]
    assert any(h["kind"] == "chapter" for h in hits)

    r = await client.post(f"/v1/stories/{sid}/notes", json={"title": "Research", "body": "fox symbolism"}, headers=H)
    assert r.status_code == 200, r.text
    note = r.json()["data"]["note"]
    r = await client.get(f"/v1/stories/{sid}/notes", headers=H)
    assert any(n["id"] == note["id"] for n in r.json()["data"]["notes"])

    r = await client.patch(f"/v1/stories/{sid}/notes/{note['id']}", json={"title": "Research", "body": "updated"}, headers=H)
    assert r.status_code == 200 and r.json()["data"]["note"]["body"] == "updated"
    r = await client.delete(f"/v1/stories/{sid}/notes/{note['id']}", headers=H)
    assert r.status_code == 200

    r = await client.get(f"/v1/stories/{sid}/stats", headers=H)
    assert r.status_code == 200, r.text
    assert r.json()["data"]["words"] >= 4


@pytest.mark.asyncio
async def test_idempotent_approve(client):
    H = await _signup(client, "idem-lifecycle@example.com")
    sid = await _story(client, H, "Idem Tale")
    payload = {
        "raw": "test draft",
        "polished": "A short polished scene.",
        "extracted": {"title_suggestion": "Idem Chapter", "characters": []},
        "allow_fallback": True,
    }
    headers = {**H, "Idempotency-Key": "same-key-1"}

    r1 = await client.post(f"/v1/stories/{sid}/flow/approve", json=payload, headers=headers)
    assert r1.status_code == 200, r1.text
    chapter_id = r1.json()["data"]["chapter_id"]

    r2 = await client.post(f"/v1/stories/{sid}/flow/approve", json=payload, headers=headers)
    assert r2.status_code == 200, r2.text
    assert r2.json()["data"]["chapter_id"] == chapter_id

    r = await client.get(f"/v1/stories/{sid}/chapters", headers=H)
    assert len(r.json()["data"]["chapters"]) == 1

    # Same key, different payload -> 409 instead of silently replaying.
    changed = {**payload, "chapter_title": "Different"}
    r3 = await client.post(f"/v1/stories/{sid}/flow/approve", json=changed, headers=headers)
    assert r3.status_code == 409
