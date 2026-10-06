from pathlib import Path
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import pymupdf
from PIL import Image
import io, os, re, shutil, subprocess, uuid, zipfile

BASE = Path(__file__).resolve().parent
LIBRARY = BASE / "data" / "library"
LIBRARY.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_BYTES = 250 * 1024 * 1024  # configurable safety guard, not a daily quota
ALLOWED = {".pdf", ".docx", ".doc", ".odt", ".rtf", ".txt", ".png", ".jpg", ".jpeg", ".tif", ".tiff"}

app = FastAPI(title="LocalPDF API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

def safe_name(name: str) -> str:
    name = Path(name or "file").name
    name = re.sub(r"[^A-Za-z0-9._ -]", "_", name).strip(" .")
    return (name or "file")[:150]

def unique_path(filename: str) -> Path:
    stem, suffix = Path(filename).stem, Path(filename).suffix.lower()
    return LIBRARY / f"{stem}_{uuid.uuid4().hex[:8]}{suffix}"

def ensure_pdf(file_id: str) -> Path:
    p = LIBRARY / safe_name(file_id)
    if not p.exists() or p.suffix.lower() != ".pdf":
        raise HTTPException(404, "PDF not found in local library")
    return p

def output_path(stem: str, suffix: str = ".pdf") -> Path:
    return unique_path(safe_name(stem) + suffix)

def save_bytes(path: Path, data: bytes):
    path.write_bytes(data)
    return path

def office_binary():
    candidates = [
        shutil.which("soffice"),
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
        "/opt/homebrew/bin/soffice",
        "/usr/local/bin/soffice",
    ]
    for c in candidates:
        if c and Path(c).exists():
            return c
    return None

@app.get("/api/health")
def health():
    return {"ok": True, "library": str(LIBRARY), "libreoffice": bool(office_binary())}

@app.get("/api/files")
def list_files():
    items = []
    for p in sorted(LIBRARY.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
        if p.is_file() and not p.name.startswith("."):
            st = p.stat()
            items.append({"id": p.name, "name": p.name, "size": st.st_size, "modified": st.st_mtime, "type": p.suffix.lower()})
    return {"files": items}

@app.post("/api/upload")
async def upload(files: List[UploadFile] = File(...)):
    saved = []
    for f in files:
        original = safe_name(f.filename or "upload")
        ext = Path(original).suffix.lower()
        if ext not in ALLOWED:
            raise HTTPException(415, f"Unsupported file type: {ext or '(no extension)'}")
        data = await f.read(MAX_UPLOAD_BYTES + 1)
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(413, f"{original} exceeds the 250 MB per-file safety limit")
        if not data:
            raise HTTPException(400, f"{original} is empty")
        dest = unique_path(original)
        dest.write_bytes(data)
        saved.append({"id": dest.name, "name": original, "stored_name": dest.name, "size": len(data), "type": ext})
    return {"files": saved}

@app.get("/api/download/{file_id}")
def download(file_id: str):
    p = LIBRARY / safe_name(file_id)
    if not p.exists() or not p.is_file():
        raise HTTPException(404, "File not found")
    return FileResponse(p, filename=p.name)

@app.delete("/api/files/{file_id}")
def delete_file(file_id: str):
    p = LIBRARY / safe_name(file_id)
    if not p.exists() or not p.is_file():
        raise HTTPException(404, "File not found")
    p.unlink()
    return {"deleted": file_id}

@app.post("/api/convert/word-to-pdf")
def word_to_pdf(file_id: str = Form(...)):
    src = LIBRARY / safe_name(file_id)
    if not src.exists() or src.suffix.lower() not in {".docx", ".doc", ".odt", ".rtf", ".txt"}:
        raise HTTPException(400, "Choose a Word/Office/text document from your library")
    binary = office_binary()
    if not binary:
        raise HTTPException(503, "LibreOffice not found. Install it with: brew install --cask libreoffice")
    outdir = LIBRARY / f"convert_{uuid.uuid4().hex}"
    outdir.mkdir()
    try:
        result = subprocess.run(
            [binary, "--headless", "--convert-to", "pdf", "--outdir", str(outdir), str(src)],
            capture_output=True, text=True, timeout=180
        )
        converted = outdir / (src.stem + ".pdf")
        if result.returncode != 0 or not converted.exists():
            raise HTTPException(500, "Conversion failed. Check that the document opens in LibreOffice.")
        dest = unique_path(src.stem + ".pdf")
        shutil.move(str(converted), str(dest))
        return {"file": {"id": dest.name, "name": dest.name, "size": dest.stat().st_size, "type": ".pdf"}}
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "Conversion took too long")
    finally:
        shutil.rmtree(outdir, ignore_errors=True)

@app.post("/api/convert/word-to-pdf-batch")
def word_to_pdf_batch(file_ids: List[str] = Form(...)):
    """Convert multiple Office/text files in one request and return a ZIP of PDFs."""
    if not file_ids:
        raise HTTPException(400, "Select one or more Word/Office/text documents")
    binary = office_binary()
    if not binary:
        raise HTTPException(503, "LibreOffice not found. Install it with: brew install --cask libreoffice")

    converted_files = []
    temp_dirs = []
    try:
        for file_id in file_ids:
            src = LIBRARY / safe_name(file_id)
            if not src.exists() or src.suffix.lower() not in {".docx", ".doc", ".odt", ".rtf", ".txt"}:
                raise HTTPException(400, f"{safe_name(file_id)} is not a supported Word/Office/text document")
            outdir = LIBRARY / f"convert_{uuid.uuid4().hex}"
            outdir.mkdir()
            temp_dirs.append(outdir)
            result = subprocess.run(
                [binary, "--headless", "--convert-to", "pdf", "--outdir", str(outdir), str(src)],
                capture_output=True, text=True, timeout=180
            )
            converted = outdir / (src.stem + ".pdf")
            if result.returncode != 0 or not converted.exists():
                raise HTTPException(500, f"Conversion failed for {src.name}. Check that it opens in LibreOffice.")
            saved_pdf = unique_path(src.stem + ".pdf")
            shutil.move(str(converted), str(saved_pdf))
            converted_files.append(saved_pdf)

        if len(converted_files) == 1:
            only = converted_files[0]
            return {"file": {"id": only.name, "name": only.name, "size": only.stat().st_size, "type": ".pdf"}, "files": [{"id": only.name, "name": only.name, "size": only.stat().st_size, "type": ".pdf"}]}

        archive = unique_path("converted_pdfs.zip")
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
            for pdf in converted_files:
                z.write(pdf, arcname=pdf.name)
        return {
            "file": {"id": archive.name, "name": archive.name, "size": archive.stat().st_size, "type": ".zip"},
            "files": [{"id": p.name, "name": p.name, "size": p.stat().st_size, "type": ".pdf"} for p in converted_files],
            "count": len(converted_files)
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "Conversion took too long. Try fewer files at a time.")
    finally:
        for folder in temp_dirs:
            shutil.rmtree(folder, ignore_errors=True)


@app.post("/api/pdf/merge")
def merge_pdfs(file_ids: List[str] = Form(...), output_name: str = Form("merged.pdf")):
    if len(file_ids) < 2:
        raise HTTPException(400, "Select at least two PDFs")
    merged = pymupdf.open()
    opened = []
    try:
        for fid in file_ids:
            p = ensure_pdf(fid)
            d = pymupdf.open(p)
            if d.needs_pass:
                raise HTTPException(400, f"{p.name} is password protected")
            merged.insert_pdf(d)
            opened.append(d)
        dest = output_path(output_name, ".pdf")
        merged.save(dest, garbage=3, deflate=True)
        return {"file": {"id": dest.name, "name": dest.name, "size": dest.stat().st_size, "type": ".pdf"}}
    finally:
        merged.close()
        for d in opened: d.close()

@app.post("/api/pdf/split")
def split_pdf(file_id: str = Form(...), pages: str = Form(...), output_name: str = Form("split.pdf")):
    src = ensure_pdf(file_id)
    try:
        doc = pymupdf.open(src)
        if doc.needs_pass: raise HTTPException(400, "PDF is password protected")
        indices = []
        for part in pages.split(","):
            part = part.strip()
            if not part: continue
            if "-" in part:
                a, b = [int(x.strip()) for x in part.split("-", 1)]
                if a < 1 or b < a or b > len(doc): raise ValueError()
                indices.extend(range(a-1, b))
            else:
                n = int(part)
                if n < 1 or n > len(doc): raise ValueError()
                indices.append(n-1)
        if not indices: raise HTTPException(400, "Enter pages such as 1-3,5")
        out = pymupdf.open()
        out.insert_pdf(doc, pages=indices)
        dest = output_path(output_name, ".pdf")
        out.save(dest, garbage=3, deflate=True)
        count = len(out)
        out.close(); doc.close()
        return {"file": {"id": dest.name, "name": dest.name, "size": dest.stat().st_size, "type": ".pdf", "pages": count}}
    except ValueError:
        raise HTTPException(400, "Invalid page range. Example: 1-3,5")

@app.post("/api/pdf/rotate")
def rotate_pdf(file_id: str = Form(...), degrees: int = Form(90), pages: str = Form("all")):
    if degrees not in (90, 180, 270): raise HTTPException(400, "Degrees must be 90, 180 or 270")
    src = ensure_pdf(file_id)
    doc = pymupdf.open(src)
    if doc.needs_pass: doc.close(); raise HTTPException(400, "PDF is password protected")
    selected = set(range(len(doc))) if pages.strip().lower() == "all" else set()
    if pages.strip().lower() != "all":
        try:
            for part in pages.split(","):
                if "-" in part:
                    a,b = map(int, part.split("-",1)); selected.update(range(a-1,b))
                else: selected.add(int(part)-1)
            if any(i < 0 or i >= len(doc) for i in selected): raise ValueError()
        except Exception:
            doc.close(); raise HTTPException(400, "Invalid page list")
    for i in selected: doc[i].set_rotation((doc[i].rotation + degrees) % 360)
    dest = output_path(src.stem + "_rotated")
    doc.save(dest, garbage=3, deflate=True); doc.close()
    return {"file": {"id": dest.name, "name": dest.name, "size": dest.stat().st_size, "type": ".pdf"}}

@app.post("/api/pdf/compress")
def compress_pdf(file_id: str = Form(...)):
    src = ensure_pdf(file_id)
    doc = pymupdf.open(src)
    if doc.needs_pass: doc.close(); raise HTTPException(400, "PDF is password protected")
    dest = output_path(src.stem + "_compressed")
    doc.save(dest, garbage=4, deflate=True, deflate_images=True, deflate_fonts=True, clean=True)
    doc.close()
    return {"file": {"id": dest.name, "name": dest.name, "size": dest.stat().st_size, "type": ".pdf"}}

@app.post("/api/convert/images-to-pdf")
def images_to_pdf(file_ids: List[str] = Form(...), output_name: str = Form("images.pdf")):
    if not file_ids: raise HTTPException(400, "Select at least one image")
    images = []
    try:
        for fid in file_ids:
            p = LIBRARY / safe_name(fid)
            if not p.exists() or p.suffix.lower() not in {".png",".jpg",".jpeg",".tif",".tiff"}:
                raise HTTPException(400, f"{safe_name(fid)} is not a supported image")
            with Image.open(p) as im:
                if im.mode not in ("RGB", "L"): im = im.convert("RGB")
                elif im.mode == "L": im = im.convert("RGB")
                buf = io.BytesIO(); im.save(buf, format="PDF")
                images.append(pymupdf.open("pdf", buf.getvalue()))
        out = pymupdf.open()
        for d in images: out.insert_pdf(d)
        dest = output_path(output_name, ".pdf")
        out.save(dest, garbage=3, deflate=True)
        out.close()
        return {"file": {"id": dest.name, "name": dest.name, "size": dest.stat().st_size, "type": ".pdf"}}
    finally:
        for d in images: d.close()

@app.post("/api/convert/pdf-to-jpg")
def pdf_to_jpg(file_id: str = Form(...), dpi: int = Form(120)):
    src = ensure_pdf(file_id)
    dpi = max(50, min(dpi, 250))
    doc = pymupdf.open(src)
    if doc.needs_pass: doc.close(); raise HTTPException(400, "PDF is password protected")
    dest = LIBRARY / f"{src.stem}_pages_{uuid.uuid4().hex[:6]}.zip"
    try:
        with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
            for i, page in enumerate(doc):
                pix = page.get_pixmap(matrix=pymupdf.Matrix(dpi/72, dpi/72), alpha=False)
                z.writestr(f"page-{i+1:03d}.jpg", pix.tobytes("jpeg"))
        return {"file": {"id": dest.name, "name": dest.name, "size": dest.stat().st_size, "type": ".zip"}}
    finally: doc.close()

@app.post("/api/pdf/page-numbers")
def page_numbers(file_id: str = Form(...), position: str = Form("bottom-center")):
    src = ensure_pdf(file_id)
    doc = pymupdf.open(src)
    if doc.needs_pass: doc.close(); raise HTTPException(400, "PDF is password protected")
    for i, page in enumerate(doc):
        rect = page.rect
        y = rect.height - 25 if position.startswith("bottom") else 25
        if position.endswith("left"): x, align = 36, 0
        elif position.endswith("right"): x, align = rect.width-36, 2
        else: x, align = rect.width/2, 1
        page.insert_text((x, y), str(i+1), fontsize=10, fontname="helv", color=(0.2,0.2,0.2), overlay=True)
    dest = output_path(src.stem + "_numbered")
    doc.save(dest, garbage=3, deflate=True); doc.close()
    return {"file": {"id": dest.name, "name": dest.name, "size": dest.stat().st_size, "type": ".pdf"}}

@app.post("/api/pdf/watermark")
def watermark_pdf(file_id: str = Form(...), text: str = Form("CONFIDENTIAL")):
    if not text.strip() or len(text) > 100: raise HTTPException(400, "Watermark must be 1–100 characters")
    src = ensure_pdf(file_id)
    doc = pymupdf.open(src)
    if doc.needs_pass: doc.close(); raise HTTPException(400, "PDF is password protected")
    for page in doc:
        rect = page.rect
        page.insert_textbox(pymupdf.Rect(30, rect.height/2-30, rect.width-30, rect.height/2+30),
            text, fontsize=28, fontname="helv", color=(0.75,0.75,0.75), align=1, overlay=True)
    dest = output_path(src.stem + "_watermarked")
    doc.save(dest, garbage=3, deflate=True); doc.close()
    return {"file": {"id": dest.name, "name": dest.name, "size": dest.stat().st_size, "type": ".pdf"}}

@app.post("/api/pdf/protect")
def protect_pdf(file_id: str = Form(...), password: str = Form(...)):
    if len(password) < 4: raise HTTPException(400, "Use a password of at least 4 characters")
    src = ensure_pdf(file_id)
    doc = pymupdf.open(src)
    if doc.needs_pass: doc.close(); raise HTTPException(400, "PDF is already password protected")
    dest = output_path(src.stem + "_protected")
    try:
        doc.save(dest, garbage=3, deflate=True, encryption=pymupdf.PDF_ENCRYPT_AES_256,
                 owner_pw=password, user_pw=password)
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(500, f"Protection failed: {e}")
    finally: doc.close()
    return {"file": {"id": dest.name, "name": dest.name, "size": dest.stat().st_size, "type": ".pdf"}}
