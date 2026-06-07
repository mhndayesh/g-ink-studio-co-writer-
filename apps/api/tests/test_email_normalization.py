"""Email is treated case-insensitively end-to-end (review fix H3).

Before the fix, `Alice@x.com` and `alice@x.com` were distinct accounts and a user
who signed up capitalized could fail to log in lowercased.
"""
import uuid

import pytest


@pytest.mark.asyncio
async def test_email_case_insensitive_signup_and_login(client):
    base = f"Mixed.Case-{uuid.uuid4().hex}"
    email_upper = f"{base}@Example.COM"
    email_lower = email_upper.lower()

    # Sign up with a mixed-case address.
    r = await client.post(
        "/v1/auth/signup",
        json={"email": email_upper, "password": "secret1", "display_name": "T"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True
    # Stored normalized to lowercase.
    assert body["data"]["user"]["email"] == email_lower

    # Log in with a DIFFERENT case → resolves to the same account.
    r2 = await client.post(
        "/v1/auth/login",
        json={"email": email_lower, "password": "secret1"},
    )
    assert r2.status_code == 200, r2.text
    assert r2.json()["data"]["user"]["email"] == email_lower

    # Signing up again with yet another case is a duplicate, not a new account.
    r3 = await client.post(
        "/v1/auth/signup",
        json={"email": f"{base.upper()}@example.com", "password": "secret1", "display_name": "T"},
    )
    assert r3.status_code == 409, r3.text
