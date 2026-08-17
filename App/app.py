import streamlit as st

from ui.api import (
    upload_pdf,
    ask_question,
    get_suggestions
)

# --------------------------------------------------
# Page Configuration
# --------------------------------------------------

st.set_page_config(
    page_title="PDF RAG Chatbot",
    page_icon="📄",
    layout="wide"
)

# --------------------------------------------------
# Session State
# --------------------------------------------------

if "messages" not in st.session_state:
    st.session_state.messages = []

if "document_uploaded" not in st.session_state:
    st.session_state.document_uploaded = False

if "document_name" not in st.session_state:
    st.session_state.document_name = None

if "chunks" not in st.session_state:
    st.session_state.chunks = 0

if "suggested_questions" not in st.session_state:
    st.session_state.suggested_questions = []

if "followups" not in st.session_state:
    st.session_state.followups = []

# --------------------------------------------------
# Helper Function
# --------------------------------------------------

def process_question(question):

    # Add user message
    st.session_state.messages.append(
        {
            "role": "user",
            "content": question
        }
    )

    response = ask_question(
        question=question,
        filename=st.session_state.document_name,
        history=st.session_state.messages[-6:]
    )

    if response.status_code == 200:

        data = response.json()

        answer = data["answer"]

        st.session_state.followups = data.get(
            "followups",
            []
        )

    else:

        answer = response.text
        st.session_state.followups = []

    st.session_state.messages.append(
        {
            "role": "assistant",
            "content": answer
        }
    )

# --------------------------------------------------
# Sidebar
# --------------------------------------------------

with st.sidebar:

    st.title("📄 PDF RAG")

    st.markdown("---")

    st.subheader("Upload Document")

    uploaded_file = st.file_uploader(
        "Choose a PDF",
        type=["pdf"]
    )

    if uploaded_file is not None:

        if st.button(
            "📤 Upload Document",
            use_container_width=True
        ):

            with st.spinner("Indexing document..."):

                response = upload_pdf(uploaded_file)

                if response.status_code == 200:

                    data = response.json()

                    st.session_state.document_uploaded = True
                    st.session_state.document_name = data["filename"]
                    st.session_state.chunks = data["chunks_stored"]

                    suggestion_response = get_suggestions(
                        data["filename"]
                    )

                    if suggestion_response.status_code == 200:

                        st.session_state.suggested_questions = (
                            suggestion_response.json().get(
                                "suggested_questions",
                                []
                            )
                        )

                    else:

                        st.session_state.suggested_questions = []

                    st.success(
                        "Document uploaded successfully!"
                    )

                    st.rerun()

                else:

                    st.error(response.text)

    st.markdown("---")

    st.subheader("Status")

    if st.session_state.document_uploaded:

        st.success("🟢 Ready")

        st.write(
            f"📄 **{st.session_state.document_name}**"
        )

        st.write(
            f"🧩 Chunks: {st.session_state.chunks}"
        )

    else:

        st.warning("No document uploaded")

    # ------------------------------------------
    # Suggested Questions
    # ------------------------------------------

    if st.session_state.suggested_questions:

        st.markdown("---")

        st.subheader("💡 Suggested Questions")

        for i, question in enumerate(
            st.session_state.suggested_questions
        ):

            if st.button(
                question,
                key=f"suggestion_{i}",
                use_container_width=True
            ):

                process_question(question)

                st.rerun()

# --------------------------------------------------
# Main Chat Area
# --------------------------------------------------

st.title("💬 Chat")

st.caption("Chat with your uploaded document.")

# --------------------------------------------------
# Display Chat History
# --------------------------------------------------

for message in st.session_state.messages:

    with st.chat_message(message["role"]):

        st.markdown(message["content"])

# --------------------------------------------------
# Follow-up Questions
# --------------------------------------------------

if (
    st.session_state.followups
    and st.session_state.messages
    and st.session_state.messages[-1]["role"] == "assistant"
):

    st.markdown("### Continue Exploring")

    cols = st.columns(
        len(st.session_state.followups)
    )

    for col, question in zip(
        cols,
        st.session_state.followups
    ):

        with col:

            if st.button(
                question,
                key=f"followup_{question}",
                use_container_width=True
            ):

                process_question(question)

                st.rerun()

# --------------------------------------------------
# Chat Input
# --------------------------------------------------

prompt = st.chat_input(
    "Ask anything about your document...",
    disabled=not st.session_state.document_uploaded
)

if prompt:

    process_question(prompt)

    st.rerun()