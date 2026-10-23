"""Private Backblaze B2 storage using its S3-compatible API."""

import os
from functools import lru_cache


def _setting(name: str, fallback: str | None = None) -> str | None:
    value = os.getenv(name)
    return value if value else (os.getenv(fallback) if fallback else None)


def is_configured() -> bool:
    return bool(
        _setting("B2_KEY_ID", "keyID")
        and _setting("B2_APPLICATION_KEY", "applicationKey")
    )


def _configuration():
    key_id = _setting("B2_KEY_ID", "keyID")
    application_key = _setting("B2_APPLICATION_KEY", "applicationKey")
    bucket = _setting("B2_BUCKET_NAME") or "ner-logistics-hub"
    region = _setting("B2_REGION") or "us-east-005"
    endpoint = _setting("B2_ENDPOINT_URL")
    if not all((key_id, application_key)):
        raise RuntimeError("Backblaze B2 storage is not fully configured")
    return key_id, application_key, bucket, region, endpoint or f"https://s3.{region}.backblazeb2.com"


@lru_cache(maxsize=1)
def _client():
    try:
        import boto3
        from botocore.config import Config
    except ImportError as exc:
        raise RuntimeError("Install backend/requirements.txt to enable Backblaze B2 uploads") from exc
    key_id, application_key, _, region, endpoint = _configuration()
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        region_name=region,
        aws_access_key_id=key_id,
        aws_secret_access_key=application_key,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def upload_object(object_key: str, body: bytes, content_type: str) -> None:
    _, _, bucket, _, _ = _configuration()
    _client().put_object(Bucket=bucket, Key=object_key, Body=body, ContentType=content_type)


def delete_object(object_key: str) -> None:
    _, _, bucket, _, _ = _configuration()
    _client().delete_object(Bucket=bucket, Key=object_key)


def create_download_url(object_key: str, expires_seconds: int = 900) -> str:
    _, _, bucket, _, _ = _configuration()
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": object_key},
        ExpiresIn=expires_seconds,
    )
