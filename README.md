# DocuFlow — Your Personal PDF Workspace

A free, locally run PDF toolkit for converting, organizing, and managing documents on your own computer.

## Why I built DocuFlow

When I used free online PDF tools, I often ran into limits on how many documents I could convert at once. Converting a few files was free, but processing a larger batch—such as 10–15 Word documents—could require a premium subscription. I built DocuFlow for my own use so I could process documents locally without relying on online conversion services or paying just to unlock a larger batch.

## Screenshots

### 1. DocuFlow workspace
![DocuFlow home page](docs/images/localpdf-home.png)

### 2. Frontend development server
![Vite frontend running](docs/images/localpdf-frontend-running.png)

### 3. Backend API server
![FastAPI backend running](docs/images/localpdf-backend-running.png)

## Features

- **Word to PDF** — convert DOCX and supported Office documents; batch conversion is designed to help process multiple documents.
- **Merge PDF** — combine PDF files in the order you choose.
- **Split PDF** — extract selected pages or a page range.
- **Rotate PDF** — rotate all pages or selected pages.
- **Compress PDF** — reduce file size where possible.
- **Images to PDF** — convert JPG/PNG images into a PDF.
- **PDF to JPG** — export PDF pages as JPG images in a ZIP archive.
- **Page numbers** — add page numbers to PDF pages.
- **Watermark** — stamp text onto pages.
- **Protect PDF** — encrypt a PDF with a password.
- **Local document library** — manage documents stored on the computer running the backend.
- **Local-first processing** — use the app on your own machine instead of uploading documents to a third-party website.

Conversion support and output quality can depend on the input file and installed local tools.

## Tech stack

- **Frontend:** React, Vite, JavaScript, HTML, CSS
- **Backend:** Python, FastAPI, Uvicorn
- **Storage:** Local filesystem for the document library
- **Document processing:** Python PDF/image libraries and any local conversion tools used by the backend

## Project structure

```text
DocuFlow/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .gitignore
│   └── data/                 # Local document library; do not commit user files
├── frontend/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── package-lock.json
├── docs/
│   └── images/               # README screenshots
└── README.md
```

## Requirements (Windows, macOS, and Linux)

- Python 3
- Node.js and npm
- LibreOffice installed and available to the backend if your Word-to-PDF implementation uses LibreOffice for document conversion

Check versions:

```bash
python --version
python3 --version
node --version
npm --version
```

On Windows, `python --version` is normally used. On macOS/Linux, use `python3 --version` if `python` is not available.

## Run locally on Windows

Use **PowerShell** or the VS Code terminal set to PowerShell. Open two terminal tabs and keep both servers running.

### 1. Start the backend

```powershell
cd path\to\DocuFlow\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Replace `path\to\DocuFlow\backend` with the actual path to your `backend` folder.

If PowerShell blocks virtual-environment activation, you can allow it for the current terminal session only:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Alternatively, skip activation and invoke the virtual environment's Python directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Backend URL: `http://127.0.0.1:8000`  
API documentation, if enabled: `http://127.0.0.1:8000/docs`

### 2. Start the frontend

In a second terminal:

```powershell
cd path\to\DocuFlow\frontend
npm install
npm run dev
```

Open the local URL printed by Vite, typically `http://localhost:5173/`.

### 3. Stop the servers

Press `Ctrl + C` in each terminal.

## Run locally on macOS

Open two terminal tabs and keep both servers running.

### 1. Start the backend

From the project's `backend` directory:

```bash
cd /path/to/DocuFlow/backend
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
```

The backend command used during development is:

```bash
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 2. Start the frontend

In a second terminal:

```bash
cd /path/to/DocuFlow/frontend
npm install
npm run dev
```

Open the local URL printed by Vite, typically `http://localhost:5173/`.

### 3. Stop the servers

Press `Control + C` in each terminal.

## Run locally on Linux

Open two terminal tabs.

### 1. Start the backend

```bash
cd /path/to/DocuFlow/backend
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 2. Start the frontend

```bash
cd /path/to/DocuFlow/frontend
npm install
npm run dev
```

Open the local URL printed by Vite.

## Privacy and security

- In the local setup above, the backend processes files on your own computer.
- The local library may contain personal documents. Keep `backend/data/` excluded from Git.
- Never commit personal PDFs, exported ZIPs, `.env` files, API keys, passwords, `.venv/`, or `node_modules/`.
- The backend binds to `127.0.0.1`, so this development configuration is intended for access from the same computer, not as a public production service.
- Keep backups of important files and verify important converted documents before relying on them.

## Contributing

Contributions, bug reports, and feature suggestions are welcome. Fork the repository, create a branch for your change, test it locally, and open a pull request with a clear description of the change.

Before contributing, please avoid committing personal documents, generated exports, secrets, or local environment folders.

## Troubleshooting

### `uvicorn` is not found

Run Uvicorn through the Python environment instead of calling the `uvicorn` executable directly.

Windows PowerShell:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

macOS/Linux:

```bash
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
```

If dependencies are missing, activate the virtual environment and install `backend/requirements.txt`.

### Frontend dependencies are missing

Run these commands from the `frontend` directory:

```bash
npm install
npm run dev
```

### Word-to-PDF conversion fails

Check that the document format is supported and that any required conversion software, such as LibreOffice, is installed and available to the backend process.

## Disclaimer

DocuFlow is a personal project provided as-is. Some files may not convert perfectly; check important output before submitting or sharing it.

## Author

**Sathvik M M**

Built to make common PDF tasks easier, more private, and less dependent on premium online tools.
