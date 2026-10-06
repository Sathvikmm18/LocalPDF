# DocuFlow — private, local PDF toolkit

A local-first iLovePDF-style starter for macOS. Files are stored under `backend/data/library` and remain there until you delete them in the Library screen or remove the folder manually. No cloud service or paid API is used.

## Included working tools
- Upload and persist files in a local library
- DOCX/DOC/ODT/RTF/TXT to PDF via LibreOffice
- PDF merge (ordered list)
- PDF split by page ranges (e.g. `1-3,5`)
- PDF rotate
- PDF compression / optimization
- Images (PNG/JPG/TIFF) to PDF
- PDF to JPG page images
- Add page numbers
- Add text watermark
- Password-protect a PDF (AES encryption support depends on installed PyMuPDF)
- Download outputs; outputs are also saved in the library

This is a core-suite starter, not a full parity replacement for every iLovePDF tool. PDF-to-Word, OCR, redaction, forms, translation and AI tools are future stages.

## Requirements
- macOS
- Python 3.11+ (Python 3.12 recommended)
- Node.js 20+ / npm
- LibreOffice (needed for Office-to-PDF conversion)

## 1. Install dependencies

```bash
brew install python@3.12 node libreoffice
```

If Homebrew is not installed, install it from https://brew.sh first.

## 2. Start the backend

Open Terminal:

```bash
cd ~/Downloads/LocalPDF/backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

If you extracted the ZIP somewhere else, replace `~/Downloads/LocalPDF` with that folder path.

Backend runs at `http://127.0.0.1:8000`. API docs: `http://127.0.0.1:8000/docs`.

## 3. Start the frontend

Open a second Terminal:

```bash
cd ~/Downloads/LocalPDF/frontend
npm install
npm run dev
```

Open the local URL Vite prints, usually `http://localhost:5173`.

## Privacy / safety notes
- The API binds to `127.0.0.1` only.
- The frontend calls only the local backend.
- Uploaded originals and generated outputs remain in `backend/data/library` until deleted.
- Only use this on a trusted Mac account. This starter does not implement user login.
- Avoid opening the backend port to your LAN or the public internet.
- Keep backups of important files. Test output quality before deleting originals.
- File limits and processing speed are constrained by your Mac's storage, memory and CPU; “unlimited” means no artificial daily quota, not infinite hardware.

## Troubleshooting
- **DOCX conversion says LibreOffice not found:** open LibreOffice once, then check:
  `which soffice` or `ls /Applications/LibreOffice.app/Contents/MacOS/soffice`
  The app checks common macOS paths.
- **Port already in use:** stop the existing process or change the port in `main.py` and update `frontend/src/App.jsx`.
- **npm command missing:** install Node.js with Homebrew and open a new Terminal.
- **Unsupported/corrupt PDF:** try opening it in Preview first. Password-protected PDFs may need unlocking first.

## Data location
`backend/data/library/` contains originals and generated outputs. Use the Library panel to delete files permanently.
