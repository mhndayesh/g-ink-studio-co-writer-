"""End-to-end billing webhook coverage through the HTTP route (review fixes:
'webhook untested end-to-end' + H7 refund resolution).

Drives POST /v1/billing/webhook/polar with signed bodies and asserts the user's
entitlement actually changes, that a replayed event id is deduped, and that a
refund carrying ONLY the subscription id still resolves the user and revokes access.
"""
import base64
import hashlib
import hmac
import json
import time
import uuid

import pytest

from app.core import plans
from app.core.config import get_settings

_SECRET = "whsec_" + base64.b64encode(b"polar-e2e-signing-secret-0001").decode()


@pytest.fixture(autouse=True)
def _polar_env(monkeypatch):
    # Switch the active billing provider to Polar for these tests, then restore.
    monkeypatch.setenv("BILLING_PROVIDER", "polar")
    monkeypatch.setenv("POLAR_WEBHOOK_SECRET", _SECRET)
    monkeypatch.setenv("POLAR_PRODUCT_DEV_AI", "prod_plus_e2e")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _sign(body: bytes, wid: str) -> dict:
    wts = str(int(time.time()))  # current → passes the freshness window
    key = base64.b64decode(_SECRET[len("whsec_"):])
    sig = base64.b64encode(hmac.new(key, f"{wid}.{wts}.".encode() + body, hashlib.sha256).digest()).decode()
    return {
        "webhook-id": wid,
        "webhook-timestamp": wts,
        "webhook-signature": f"v1,{sig}",
        "content-type": "application/json",
    }


async def _signup(client) -> tuple[str, str]:
    email = f"wh-{uuid.uuid4().hex}@x.z"
    r = await client.post(
        "/v1/auth/signup",
        json={"email": email, "password": "secret1", "display_name": "W"},
    )
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    return data["user"]["id"], data["tokens"]["access_token"]


@pytest.mark.asyncio
async def test_webhook_activates_then_idempotent_then_refund_revokes(client):
    user_id, token = await _signup(client)
    auth = {"Authorization": f"Bearer {token}"}
    sub_id = f"sub_{uuid.uuid4().hex}"

    # 1. subscription.active → user upgraded to dev_ai.
    active_body = json.dumps({
        "type": "subscription.active",
        "data": {
            "id": sub_id,
            "status": "active",
            "product_id": "prod_plus_e2e",
            "customer_id": f"cus_{uuid.uuid4().hex}",
            "current_period_end": "2030-01-01T00:00:00Z",
            "metadata": {"user_id": user_id},
        },
    }).encode()
    r = await client.post("/v1/billing/webhook/polar", content=active_body, headers=_sign(active_body, "evt_active_1"))
    assert r.status_code == 200, r.text
    assert r.json()["data"]["applied"] is True

    me = await client.get("/v1/billing/me", headers=auth)
    assert me.status_code == 200, me.text
    assert me.json()["data"]["effective_tier"] == plans.DEV_AI

    # 2. Replay the SAME event id → deduped, not re-applied.
    r2 = await client.post("/v1/billing/webhook/polar", content=active_body, headers=_sign(active_body, "evt_active_1"))
    assert r2.status_code == 200, r2.text
    assert r2.json()["data"].get("duplicate") is True

    # 3. order.refunded carrying ONLY the subscription id (no metadata user, no
    #    customer.external_id) → resolves via the stored external_subscription_id
    #    (the H7 fix) and revokes paid access.
    refund_body = json.dumps({
        "type": "order.refunded",
        "data": {"id": f"ord_{uuid.uuid4().hex}", "subscription_id": sub_id},
    }).encode()
    r3 = await client.post("/v1/billing/webhook/polar", content=refund_body, headers=_sign(refund_body, "evt_refund_1"))
    assert r3.status_code == 200, r3.text
    assert r3.json()["data"]["applied"] is True

    me2 = await client.get("/v1/billing/me", headers=auth)
    assert me2.status_code == 200, me2.text
    assert me2.json()["data"]["effective_tier"] == plans.FREE


@pytest.mark.asyncio
async def test_webhook_rejects_stale_timestamp(client):
    user_id, _ = await _signup(client)
    body = json.dumps({
        "type": "subscription.active",
        "data": {"id": "sub_x", "status": "active", "product_id": "prod_plus_e2e",
                 "metadata": {"user_id": user_id}},
    }).encode()
    # Sign with an old timestamp → outside the freshness window → rejected.
    wid, wts = "evt_stale", "1717400000"
    key = base64.b64decode(_SECRET[len("whsec_"):])
    sig = base64.b64encode(hmac.new(key, f"{wid}.{wts}.".encode() + body, hashlib.sha256).digest()).decode()
    headers = {"webhook-id": wid, "webhook-timestamp": wts, "webhook-signature": f"v1,{sig}", "content-type": "application/json"}
    r = await client.post("/v1/billing/webhook/polar", content=body, headers=headers)
    assert r.status_code == 401, r.text
