import streamlit as st
import requests

BASE_URL = st.secrets.get(
    "BACKEND_URL",
    "http://127.0.0.1:8000"
)


def upload_pdf(uploaded_file):

    files = {
        "file": (
            uploaded_file.name,
            uploaded_file.getvalue(),
            "application/pdf"
        )
    }

    response = requests.post(
        f"{BASE_URL}/upload",
        files=files
    )

    return response


def ask_question(question, filename, history):

    payload = {
        "question": question,
        "filename": filename,
        "history": history
    }

    response = requests.post(
        f"{BASE_URL}/chat",
        json=payload
    )

    return response


def get_suggestions(filename):

    response = requests.post(
        f"{BASE_URL}/suggestions",
        json={
            "filename": filename
        }
    )

    return response