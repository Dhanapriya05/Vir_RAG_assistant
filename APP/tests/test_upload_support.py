import unittest
from types import SimpleNamespace

from ui.api import build_upload_payload


class UploadPayloadTests(unittest.TestCase):
    def test_build_upload_payload_uses_actual_file_type(self):
        uploaded = SimpleNamespace(
            name="notes.txt",
            getvalue=lambda: b"hello world",
        )

        payload = build_upload_payload(uploaded)

        self.assertEqual(payload["file"][0], "notes.txt")
        self.assertEqual(payload["file"][2], "text/plain")

    def test_build_upload_payload_handles_pdf_files(self):
        uploaded = SimpleNamespace(
            name="report.pdf",
            getvalue=lambda: b"%PDF-1.4",
        )

        payload = build_upload_payload(uploaded)

        self.assertEqual(payload["file"][2], "application/pdf")


if __name__ == "__main__":
    unittest.main()
