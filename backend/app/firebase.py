from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore

from .config import get_settings


def initialise_firebase() -> None:
    """Initialise Firebase Admin once, using a service account or ADC."""
    if firebase_admin._apps:
        return

    settings = get_settings()
    if settings.firebase_service_account_path:
        credential_path = Path(settings.firebase_service_account_path)
        if not credential_path.is_absolute():
            credential_path = Path(__file__).resolve().parents[1] / credential_path
        firebase_admin.initialize_app(credentials.Certificate(str(credential_path)))
        return

    options = {"projectId": settings.firebase_project_id} if settings.firebase_project_id else None
    firebase_admin.initialize_app(options=options)


def get_db():
    initialise_firebase()
    return firestore.client()
