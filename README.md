# LocalPDF

**A free, local-first PDF toolkit for your Mac.**

LocalPDF is a personal document workspace for converting, organizing, and managing PDFs without relying on online conversion websites or paying for premium plans just to process multiple files.

I built this project for my own use after running into limits on free online PDF tools. Many services restrict free conversions to a small number of documents or ask users to upgrade when they need to process a larger batch. LocalPDF gives me a workspace I control, where I can process multiple documents in one workflow.

> **Privacy-first by design:** files are processed by the application running on your own computer. Keep the backend bound to `127.0.0.1` for local-only access.

## Preview

![LocalPDF application preview](docs/assets/localpdf-preview.png)

## Why I built LocalPDF

I wanted a practical alternative to online PDF tools that:

- Lets me convert **multiple documents in one batch**, rather than being restricted to a few free conversions.
- Avoids recurring subscriptions or premium upgrades for my personal workflow.
- Keeps my documents on my own computer instead of requiring uploads to a third-party conversion website.
- Brings common PDF tasks into one clean, easy-to-use workspace.
- Gives me control over my document library and the files I choose to keep.

This started as a personal productivity project. The goal is simple: **useful PDF tools, without unnecessary limits or subscriptions.**

## Features

### Convert
- **Word to PDF** — convert DOCX and supported Office documents to PDF.
- **Batch Word-to-PDF** — process multiple documents in one workflow.
- **Images to PDF** — combine image files into a PDF.
- **PDF to JPG** — export PDF pages as JPG images in a ZIP archive.

### Organize
- **Merge PDF** — combine multiple PDFs in the selected order.
- **Split PDF** — extract a page range from a PDF.
- **Rotate PDF** — rotate all pages or selected pages.

### Edit and protect
- **Page numbers** — add page numbers to PDF pages.
- **Watermark** — stamp text across PDF pages.
- **Protect PDF** — encrypt a PDF with a password.

### Personal workspace
- **My Library** — access files saved by the local application.
- **Manual deletion** — remove files you no longer need.
- **Local processing** — run the frontend and backend on your own machine.

> Available operations depend on the installed dependencies and supported file formats. Office conversion may require LibreOffice to be installed.

## Tech stack

- **Frontend:** React, Vite, JavaScript, HTML, CSS
- **Backend:** Python, FastAPI, Uvicorn
- **Document processing:** Python PDF/image libraries and LibreOffice for Office conversion (where configured)
- **Development tools:** npm, Python virtual environment, Git

## Run locally on macOS

### Prerequisites

- Python 3
- Node.js and npm
- LibreOffice, if required for Word/Office conversion

### 1. Open the project

In Terminal, navigate to the project folder. Example:

```bash
cd ~/Downloads/LocalPDF
```

Use your actual folder path if the project is stored elsewhere.

### 2. Start the backend

Open a Terminal tab/window and run:

```bash
cd ~/Downloads/LocalPDF/backend
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
```

If you have already created `.venv` and installed the dependencies, start it with:

```bash
cd ~/Downloads/LocalPDF/backend
source .venv/bin/activate
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
```

The backend should be available at `http://127.0.0.1:8000`. If FastAPI's interactive docs are enabled, visit `http://127.0.0.1:8000/docs`.

Keep this terminal running while using LocalPDF.

### 3. Start the frontend

Open a **second** Terminal tab/window:

```bash
cd ~/Downloads/LocalPDF/frontend
npm install
npm run dev
```

Open the local URL printed by Vite, commonly `http://localhost:5173`.

### 4. Stop the application

Press `Control + C` in each Terminal window running the backend and frontend.

## Project structure

```text
LocalPDF/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .gitignore
│   └── data/                 # Local files; do not commit personal documents
├── frontend/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── package-lock.json
├── docs/
│   └── assets/
│       └── localpdf-preview.png
├── .gitignore
└── README.md
```

Your exact structure may vary depending on your local changes.

## Privacy and security

- Keep the backend bound to `127.0.0.1` when you want it accessible only from your Mac.
- Do not commit personal documents, generated PDFs, passwords, API keys, `.env` files, virtual environments, or `node_modules`.
- This is designed for local use. Before exposing the backend publicly, review authentication, access controls, CORS, file handling, and deployment security.
- “Local” describes the intended setup; it does not mean every dependency has been independently audited. Review the code and dependencies before using sensitive documents.
- Keep backups of important documents. A local library is not a backup.

## Project status

LocalPDF is a personal project built to meet my own document-conversion and PDF-management needs. Features and compatibility may change as development continues.

## Possible future improvements

- Additional conversion formats and batch-processing options
- Drag-and-drop file handling
- Clearer conversion progress and error messages
- More compression controls
- Automated tests and easier installation

## License

No license has been specified yet. If you publish this repository on GitHub, add a license file if you want to define how others may use, modify, and distribute the project.
