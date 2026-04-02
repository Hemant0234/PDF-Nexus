import os
import io
import time
import uuid
import base64
import threading
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify, g, send_file
from flask_cors import CORS

import PyPDF2
from pdf2docx import Converter
from PIL import Image
import fitz  # PyMuPDF

import pdfplumber
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit

try:
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

app = Flask(__name__)

# Allow requests from any origin in production (restrict via env var if needed)
allowed_origins = os.environ.get('ALLOWED_ORIGINS', '*')
CORS(app, resources={r"/*": {"origins": allowed_origins}})

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp_uploads')
MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100 MB max file upload size
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}
FILE_TTL_SECONDS = 3600 # 1 hour before auto-delete

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_safe_path(extension):
    file_id = str(uuid.uuid4())
    secure_name = f"{file_id}.{extension}"
    return os.path.join(app.config['UPLOAD_FOLDER'], secure_name), file_id

def send_file_and_clean(file_path, download_name):
    """Schedules the file for deletion 10 seconds after sending it, fulfilling the immediate auto-delete requirement."""
    def delete_later(path):
        time.sleep(10) # Enough time for send_file to stream it out
        try:
            if os.path.exists(path):
                os.remove(path)
                print(f"[Cleanup] Securely auto-deleted sent file: {path}")
        except Exception as e:
            print(f"[Cleanup] Error deleting immediately: {e}")
            
    threading.Thread(target=delete_later, args=(file_path,), daemon=True).start()
    return send_file(file_path, as_attachment=True, download_name=download_name)

# Background worker to clean up old files automatically
def cleanup_temp_files():
    while True:
        try:
            now = time.time()
            if os.path.exists(UPLOAD_FOLDER):
                for filename in os.listdir(UPLOAD_FOLDER):
                    file_path = os.path.join(UPLOAD_FOLDER, filename)
                    if os.path.isfile(file_path):
                        creation_time = os.path.getmtime(file_path)
                        if now - creation_time > FILE_TTL_SECONDS:
                            os.remove(file_path)
                            print(f"[Cleanup] Deleted expired file: {file_path}")
        except Exception as e:
            print(f"[Cleanup] Error during cleanup: {e}")
        time.sleep(60)

cleanup_thread = threading.Thread(target=cleanup_temp_files, daemon=True)
cleanup_thread.start()

# ------------- ERROR HANDLERS -------------
@app.errorhandler(400)
def bad_request(error): return jsonify({"error": "Bad Request", "message": str(error)}), 400
@app.errorhandler(404)
def not_found(error): return jsonify({"error": "Not Found", "message": str(error)}), 404
@app.errorhandler(413)
def payload_too_large(error): return jsonify({"error": "Payload Too Large", "message": "File exceeds the 100MB limit."}), 413
@app.errorhandler(500)
def internal_server_error(error): return jsonify({"error": "Internal Server Error", "message": "An unexpected error occurred."}), 500

# ------------- API ROUTES -------------

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "running"}), 200

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files: return jsonify({"error": "No file part in the request"}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else 'tmp'
            save_path, file_id = generate_safe_path(ext)
            file.save(save_path)
            return jsonify({
                "message": "File uploaded",
                "file_id": file_id,
                "file_name": filename,
                "file_path": save_path
            }), 201
        except Exception as e:
            return jsonify({"error": "Internal server error", "details": str(e)}), 500
    return jsonify({"error": "Invalid file type"}), 400

@app.route('/merge', methods=['POST'])
def merge_pdf():
    files = request.files.getlist('files')
    if not files or len(files) < 2:
        return jsonify({"error": "Please provide at least two PDF files to merge."}), 400
        
    merger = PyPDF2.PdfMerger()
    try:
        for file in files:
            if not file.filename.endswith(('.pdf', '.PDF')):
                return jsonify({"error": "Only PDF files are allowed for merging."}), 400
            save_path, _ = generate_safe_path("pdf")
            file.save(save_path)
            merger.append(save_path)
            
        output_path, _ = generate_safe_path("pdf")
        with open(output_path, "wb") as fout:
            merger.write(fout)
        merger.close()
        return send_file_and_clean(output_path, "merged.pdf")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/split', methods=['POST'])
def split_pdf():
    file = request.files.get('file')
    if not file or not file.filename.endswith(('.pdf', '.PDF')):
        return jsonify({"error": "Valid PDF file is required."}), 400
        
    try:
        start_page = int(request.form.get('start_page', 1))
        end_page = int(request.form.get('end_page', 1))
        
        input_path, _ = generate_safe_path("pdf")
        file.save(input_path)
        
        reader = PyPDF2.PdfReader(input_path)
        writer = PyPDF2.PdfWriter()
        
        total_pages = len(reader.pages)
        start_index = max(0, start_page - 1)
        end_index = min(total_pages, end_page)
        
        if start_index >= end_index or start_index >= total_pages:
            return jsonify({"error": "Invalid page range."}), 400
            
        for i in range(start_index, end_index):
            writer.add_page(reader.pages[i])
            
        output_path, _ = generate_safe_path("pdf")
        with open(output_path, "wb") as fout:
            writer.write(fout)
            
        return send_file_and_clean(output_path, f"split_pages_{start_page}_to_{end_page}.pdf")
    except ValueError:
        return jsonify({"error": "Page fields must be numbers."}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/convert-word', methods=['POST'])
def convert_to_word():
    file = request.files.get('file')
    if not file or not file.filename.endswith(('.pdf', '.PDF')):
        return jsonify({"error": "Valid PDF file is required."}), 400
        
    try:
        input_path, _ = generate_safe_path("pdf")
        file.save(input_path)
        output_path, _ = generate_safe_path("docx")
        
        cv = Converter(input_path)
        cv.convert(output_path)
        cv.close()
        
        return send_file_and_clean(output_path, "converted_document.docx")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/resize-image', methods=['POST'])
def resize_image():
    file = request.files.get('file')
    if not file or not allowed_file(file.filename):
        return jsonify({"error": "Valid image file is required."}), 400
        
    try:
        width = int(request.form.get('width', 800))
        height = int(request.form.get('height', 800))
        target_size_kb = request.form.get('target_size_kb')
        
        extension = file.filename.rsplit('.', 1)[1].lower()
        save_ext = 'jpeg' if extension == 'jpg' else extension
        
        # If user demands a strictly compressed file size, force to JPEG since PNG cannot be arbitrarily compressed without complex quantization
        if target_size_kb and save_ext == 'png':
            save_ext = 'jpeg'
            
        img = Image.open(file)
        # Using LANCZOS filtering for high-quality downsampling
        img = img.resize((width, height), Image.Resampling.LANCZOS)
        
        output_path, _ = generate_safe_path(save_ext)
        if img.mode in ("RGBA", "P") and save_ext == 'jpeg':
            img = img.convert("RGB")
            
        if target_size_kb and save_ext in ['jpeg', 'jpg', 'webp']:
            target_bytes = int(target_size_kb) * 1024
            min_q = 5
            max_q = 100
            best_q = 5 # Default to lowest
            
            # Phase 1: Algorithmic binary search to find the perfect quality percentage
            for _ in range(8):
                mid_q = (min_q + max_q) // 2
                # subsampling=0 ensures maximum file bloat if quality hits near 100
                img.save(output_path, format=save_ext.upper(), quality=mid_q, optimize=True, subsampling=0)
                size = os.path.getsize(output_path)
                if size <= target_bytes:
                    best_q = mid_q
                    min_q = mid_q + 1 # Try to push quality higher within limit
                else:
                    max_q = mid_q - 1 # Need smaller footprint
                    
            img.save(output_path, format=save_ext.upper(), quality=best_q, optimize=True, subsampling=0)
            
            # Phase 2: If the image is STILL larger than target (extremely small KB requested), shrink resolution dynamically
            current_size = os.path.getsize(output_path)
            
            # Phase 3: If the image is Way TOO SMALL compared to the requested target (user wants to artificially bloat size up to the limit)
            # We scale UP the resolution ONLY IF they didn't strictly ask for fixed small dimensions
            if current_size < target_bytes * 0.8 and best_q >= 98:
               attempts_up = 0
               while current_size < target_bytes and attempts_up < 5:
                   new_w = int(img.width * 1.15)
                   new_h = int(img.height * 1.15)
                   if new_w > 8000 or new_h > 8000: break # Prevent memory bombs
                   img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                   img.save(output_path, format=save_ext.upper(), quality=100, optimize=False, subsampling=0)
                   current_size = os.path.getsize(output_path)
                   attempts_up += 1

            attempts = 0
            while current_size > target_bytes and attempts < 15:
                new_w = int(img.width * 0.85)
                new_h = int(img.height * 0.85)
                # Fail-safe to avoid completely invisible images
                if new_w < 10 or new_h < 10: break
                
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                # Keep a decent quality but rely on pixel loss for byte crunching
                img.save(output_path, format=save_ext.upper(), quality=max(10, best_q), optimize=True)
                current_size = os.path.getsize(output_path)
                attempts += 1
            
        elif save_ext in ['jpeg', 'jpg', 'webp']:
            img.save(output_path, format=save_ext.upper(), quality=85, optimize=True)
        elif save_ext == 'png':
            img.save(output_path, format='PNG', optimize=True)
        else:
            img.save(output_path, format=save_ext.upper())
        
        return send_file_and_clean(output_path, f"resized_image.{save_ext}")
    except ValueError:
        return jsonify({"error": "Width and height must be valid numbers."}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/pdf-page-count', methods=['POST'])
def pdf_page_count():
    """Quick endpoint to get total page count before showing the range selector."""
    file = request.files.get('file')
    if not file:
        return jsonify({"error": "No file"}), 400
    try:
        input_path, _ = generate_safe_path("pdf")
        file.save(input_path)
        doc = fitz.open(input_path)
        count = len(doc)
        doc.close()
        return jsonify({"total_pages": count}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/convert-format', methods=['POST'])
def convert_format():
    file = request.files.get('file')
    target_format = request.form.get('format', 'pdf').lower()
    # Page selection params (only for PDF → image)
    page_mode = request.form.get('page_mode', 'all')   # 'all' | 'single' | 'range'
    page_single = request.form.get('page_single', '1') # 1-based
    page_from   = request.form.get('page_from', '1')    # 1-based
    page_to     = request.form.get('page_to', '1')      # 1-based

    if not file or target_format not in ['pdf', 'png', 'jpg', 'jpeg']:
        return jsonify({"error": "Invalid file or target format."}), 400

    try:
        original_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        input_path, _ = generate_safe_path(original_ext)
        file.save(input_path)

        save_ext = 'jpeg' if target_format == 'jpg' else target_format

        # ── PDF → Image ───────────────────────────────────────────────────────
        if original_ext == 'pdf' and target_format in ['png', 'jpg', 'jpeg']:
            doc = fitz.open(input_path)
            total = len(doc)
            if total == 0:
                return jsonify({"error": "PDF is empty"}), 400

            # Determine which pages to convert
            if page_mode == 'single':
                p = max(0, min(int(page_single) - 1, total - 1))
                page_indices = [p]
            elif page_mode == 'range':
                pf = max(0, int(page_from) - 1)
                pt = min(int(page_to) - 1, total - 1)
                page_indices = list(range(pf, pt + 1))
            else:  # 'all'
                page_indices = list(range(total))

            if len(page_indices) == 1:
                # Single page — return one image file
                page = doc.load_page(page_indices[0])
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                output_path, _ = generate_safe_path(save_ext)
                pix.save(output_path)
                doc.close()
                fname = f"page_{page_indices[0]+1}.{target_format}"
                return send_file_and_clean(output_path, fname)
            else:
                # Multiple pages — package into a ZIP
                import zipfile
                zip_path, _ = generate_safe_path("zip")
                with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                    for idx in page_indices:
                        page = doc.load_page(idx)
                        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                        img_path, _ = generate_safe_path(save_ext)
                        pix.save(img_path)
                        zf.write(img_path, f"page_{idx+1}.{target_format}")
                        try: os.remove(img_path)
                        except: pass
                doc.close()
                return send_file_and_clean(zip_path, f"converted_pages.zip")

        # ── Image → PDF ───────────────────────────────────────────────────────
        elif original_ext in ['png', 'jpg', 'jpeg'] and target_format == 'pdf':
            output_path, _ = generate_safe_path("pdf")
            img = Image.open(input_path)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img.save(output_path, format="PDF", resolution=100.0)
            return send_file_and_clean(output_path, "converted_file.pdf")

        else:
            return jsonify({"error": f"Unsupported: {original_ext} → {target_format}. Convert PDF→Image or Image→PDF."}), 400

    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


import base64

@app.route('/extract-thumbnails', methods=['POST'])
def extract_thumbnails():
    file = request.files.get('file')
    if not file or not file.filename.endswith(('.pdf', '.PDF')):
        return jsonify({"error": "Valid PDF file is required."}), 400
        
    try:
        input_path, file_id = generate_safe_path("pdf")
        file.save(input_path)
        
        doc = fitz.open(input_path)
        thumbnails = []
        
        # Limit to 50 pages to prevent memory overload in the demo
        page_limit = min(len(doc), 50)
        
        for i in range(page_limit):
            page = doc.load_page(i)
            # Low resolution for quick thumbnail generation
            pix = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5))
            img_data = pix.tobytes("jpeg")
            b64_string = base64.b64encode(img_data).decode('utf-8')
            
            thumbnails.append({
                "id": str(i),
                "originalIndex": i,
                "data": f"data:image/jpeg;base64,{b64_string}"
            })
            
        total_pages = len(doc)
        doc.close()
        return jsonify({
            "file_id": file_id,
            "thumbnails": thumbnails,
            "total_pages": total_pages
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/reorder', methods=['POST'])
def reorder_pages():
    try:
        data = request.json
        file_id = data.get('file_id')
        new_order = data.get('new_order') # e.g. ["2", "0", "1"]
        
        if not file_id or new_order is None:
            return jsonify({"error": "Missing file_id or new_order parameters."}), 400
            
        input_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.pdf")
        if not os.path.exists(input_path):
            return jsonify({"error": "Original PDF file not found or expired. Please upload again."}), 404
            
        reader = PyPDF2.PdfReader(input_path)
        writer = PyPDF2.PdfWriter()
        
        for idx_str in new_order:
            idx = int(idx_str)
            if 0 <= idx < len(reader.pages):
                writer.add_page(reader.pages[idx])
                
        output_path, _ = generate_safe_path("pdf")
        with open(output_path, "wb") as fout:
            writer.write(fout)
            
        return send_file_and_clean(output_path, "reordered.pdf")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/extract-text', methods=['POST'])
def extract_text():
    file = request.files.get('file')
    if not file or not file.filename.endswith(('.pdf', '.PDF')):
        return jsonify({"error": "Valid PDF file is required."}), 400
        
    try:
        input_path, file_id = generate_safe_path("pdf")
        file.save(input_path)
        
        pages_text = []
        with pdfplumber.open(input_path) as pdf:
            # Limit to 50 pages for demo purposes
            for page in pdf.pages[:50]:
                text = page.extract_text()
                pages_text.append(text if text else "")
                
        return jsonify({
            "file_id": file_id,
            "pages": pages_text
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/extract-page-data', methods=['POST'])
def extract_page_data():
    """
    Sejda-style approach:
    1. Renders each PDF page as a high-res image (2x scale)
    2. Extracts ALL text spans with exact PDF coordinates (x,y,w,h,fontSize,color)
    3. Returns image (base64) + text blocks per page
    4. Falls back to OCR via pytesseract if page has no extractable text (scanned PDF)
    """
    file = request.files.get('file')
    if not file or not file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Valid PDF required"}), 400

    try:
        input_path, file_id = generate_safe_path("pdf")
        file.save(input_path)

        doc = fitz.open(input_path)
        RENDER_SCALE = 2.0  # 2x for crisp image display + coord accuracy

        pages_data = []

        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            page_rect = page.rect
            pdf_w = page_rect.width
            pdf_h = page_rect.height

            # ── Render page to image ──────────────────────────────────────────
            mat = fitz.Matrix(RENDER_SCALE, RENDER_SCALE)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img_bytes = pix.tobytes("png")
            img_b64 = base64.b64encode(img_bytes).decode('utf-8')

            # ── Extract text spans with exact coordinates ─────────────────────
            blocks = []
            text_dict = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)

            for block in text_dict.get("blocks", []):
                if block.get("type") != 0:  # type 0 = text block
                    continue
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        raw_text = span.get("text", "").strip()
                        if not raw_text:
                            continue

                        # span bbox in PDF points (origin: top-left in PyMuPDF 1.19+)
                        x0, y0, x1, y1 = span["bbox"]
                        span_w = x1 - x0
                        span_h = y1 - y0

                        # Convert to image-pixel coords for the frontend overlay
                        px_x = x0 * RENDER_SCALE
                        px_y = y0 * RENDER_SCALE
                        px_w = span_w * RENDER_SCALE
                        px_h = span_h * RENDER_SCALE

                        # ── Color ────────────────────────────────────────────
                        color_int = span.get("color", 0)
                        r = (color_int >> 16) & 0xFF
                        g = (color_int >> 8) & 0xFF
                        b = color_int & 0xFF
                        hex_color = f"#{r:02x}{g:02x}{b:02x}"

                        # ── Font size ────────────────────────────────────────
                        font_size_pt = span.get("size", 12)
                        font_size_px = font_size_pt * RENDER_SCALE

                        # ── Font name — strip subset prefix "ABCDEF+" ────────
                        raw_font_name = span.get("font", "Helvetica")
                        if "+" in raw_font_name:
                            raw_font_name = raw_font_name.split("+", 1)[1]
                        font_name_lower = raw_font_name.lower()

                        # ── Bold / Italic — check BOTH flags AND font name ───
                        flags = span.get("flags", 0)
                        # flag bits: superscript=1, italic=2, serifed=4, mono=8, bold=16
                        is_bold_flag   = bool(flags & 16)
                        is_italic_flag = bool(flags & 2)
                        is_mono_flag   = bool(flags & 8)
                        is_serif_flag  = bool(flags & 4)

                        # Also detect from font name (more reliable for many PDFs)
                        bold_keywords   = ["bold", "heavy", "black", "semibold",
                                           "demibold", "extrabold", "ultrabold",
                                           "medium", "demi"]
                        italic_keywords = ["italic", "oblique", "slanted", "inclined"]

                        is_bold =   is_bold_flag   or any(k in font_name_lower for k in bold_keywords)
                        is_italic = is_italic_flag or any(k in font_name_lower for k in italic_keywords)

                        # Font weight as a number (700 bold, 400 regular, etc.)
                        if "black" in font_name_lower or "heavy" in font_name_lower:
                            font_weight = 900
                        elif "extrabold" in font_name_lower or "ultrabold" in font_name_lower:
                            font_weight = 800
                        elif "bold" in font_name_lower or is_bold_flag:
                            font_weight = 700
                        elif "semibold" in font_name_lower or "demibold" in font_name_lower:
                            font_weight = 600
                        elif "medium" in font_name_lower:
                            font_weight = 500
                        elif "light" in font_name_lower or "thin" in font_name_lower:
                            font_weight = 300
                        else:
                            font_weight = 400

                        # ── Letter spacing from char width data ──────────────
                        # origin is a list of char origins; compute avg char width
                        char_spacing = 0.0
                        origins = span.get("origin", None)
                        chars   = span.get("chars", None)
                        if chars and len(chars) > 1:
                            try:
                                widths = [c.get("bbox", [0,0,0,0])[2] - c.get("bbox", [0,0,0,0])[0] for c in chars]
                                char_spacing = round(sum(widths) / len(widths) * 0.02, 2)
                            except Exception:
                                char_spacing = 0.0

                        blocks.append({
                            "id": f"p{page_num}_s{len(blocks)}",
                            "text": raw_text,
                            # PDF-point coords
                            "pdf_x": x0,
                            "pdf_y": y0,
                            "pdf_w": span_w,
                            "pdf_h": span_h,
                            # Pixel coords for overlay
                            "px_x": px_x,
                            "px_y": px_y,
                            "px_w": px_w,
                            "px_h": px_h,
                            # Font metadata
                            "font_size_pt": font_size_pt,
                            "font_size_px": font_size_px,
                            "color": hex_color,
                            "bold": is_bold,
                            "italic": is_italic,
                            "font_weight": font_weight,
                            "is_mono": is_mono_flag,
                            "is_serif": is_serif_flag,
                            "font_name": raw_font_name,       # cleaned name e.g. "TimesNewRomanPS-BoldMT"
                            "char_spacing": char_spacing,
                            "page": page_num,
                        })


            # ── OCR fallback for scanned/image PDFs ───────────────────────────
            is_scanned = len(blocks) == 0
            if is_scanned and OCR_AVAILABLE:
                try:
                    pil_img = Image.open(io.BytesIO(img_bytes))
                    ocr_data = pytesseract.image_to_data(
                        pil_img, output_type=pytesseract.Output.DICT, lang='eng'
                    )
                    n = len(ocr_data['text'])
                    for i in range(n):
                        word = ocr_data['text'][i].strip()
                        if not word or int(ocr_data['conf'][i]) < 40:
                            continue
                        # Tesseract coords are in original image pixels
                        ox = float(ocr_data['left'][i])
                        oy = float(ocr_data['top'][i])
                        ow = float(ocr_data['width'][i])
                        oh = float(ocr_data['height'][i])
                        est_fs = oh * 0.75  # rough font-size estimate

                        blocks.append({
                            "id": f"p{page_num}_ocr{i}",
                            "text": word,
                            "pdf_x": ox / RENDER_SCALE,
                            "pdf_y": oy / RENDER_SCALE,
                            "pdf_w": ow / RENDER_SCALE,
                            "pdf_h": oh / RENDER_SCALE,
                            "px_x": ox,
                            "px_y": oy,
                            "px_w": ow,
                            "px_h": oh,
                            "font_size_pt": est_fs / RENDER_SCALE,
                            "font_size_px": est_fs,
                            "color": "#000000",
                            "bold": False,
                            "italic": False,
                            "font_name": "Helvetica",
                            "page": page_num,
                            "ocr": True,
                        })
                except Exception as ocr_err:
                    print(f"OCR failed page {page_num}: {ocr_err}")

            pages_data.append({
                "page_num": page_num,
                "img_b64": img_b64,
                "img_w": pix.width,
                "img_h": pix.height,
                "pdf_w": pdf_w,
                "pdf_h": pdf_h,
                "render_scale": RENDER_SCALE,
                "is_scanned": is_scanned,
                "blocks": blocks,
            })

        doc.close()
        return jsonify({
            "file_id": file_id,
            "num_pages": len(pages_data),
            "pages": pages_data,
        }), 200

    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500



def resolve_pdf_fontname(font_name: str, is_bold: bool, is_italic: bool, is_mono: bool, is_serif: bool) -> str:
    """
    Map a PDF font name → PyMuPDF Base-14 fontname code.
    PyMuPDF Base-14 codes:
      helv / hebo / heit / hebi  (Helvetica variants)
      tiro / tibo / tiit / tibi  (Times variants)
      cour / cobo / coit / cobi  (Courier variants)
    """
    name = (font_name or '').lower()
    # strip subset prefix XXXXXX+
    if '+' in name:
        name = name.split('+', 1)[1]

    # Detect family from font name
    is_times   = any(k in name for k in ['times', 'georgia', 'garamond', 'palatino',
                                          'bookman', 'cambria', 'constantia', 'minion'])
    is_courier = any(k in name for k in ['courier', 'consolas', 'lucidaconsole',
                                          'monaco', 'sourcecodepro', 'inconsolata'])
    # Also use flags from backend metadata
    if is_mono:   is_courier = True
    if is_serif and not is_courier: is_times = True

    if is_courier:
        if is_bold and is_italic: return 'cobi'
        if is_bold:               return 'cobo'
        if is_italic:             return 'coit'
        return 'cour'
    elif is_times:
        if is_bold and is_italic: return 'tibi'
        if is_bold:               return 'tibo'
        if is_italic:             return 'tiit'
        return 'tiro'
    else:  # Helvetica / Arial / sans-serif default
        if is_bold and is_italic: return 'hebi'
        if is_bold:               return 'hebo'
        if is_italic:             return 'heit'
        return 'helv'


@app.route('/apply-edits', methods=['POST'])
def apply_edits():
    """
    Apply edits — white-out original bbox, reinsert with matched font.
    Payload per edit:
    {
        page, pdf_x, pdf_y, pdf_w, pdf_h,
        text, font_size_pt, color,
        font_name, bold, italic, is_mono, is_serif,  ← NEW font fields
        deleted, is_new
    }
    """
    try:
        data    = request.json
        file_id = data.get('file_id')
        edits   = data.get('edits', [])

        if not file_id:
            return jsonify({"error": "Missing file_id"}), 400

        input_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.pdf")
        if not os.path.exists(input_path):
            return jsonify({"error": "PDF not found or expired. Please upload again."}), 404

        doc = fitz.open(input_path)

        for edit in edits:
            pno = edit.get('page', 0)
            if pno >= len(doc):
                continue
            page = doc.load_page(pno)

            x0      = float(edit.get('pdf_x', 0))
            y0      = float(edit.get('pdf_y', 0))
            w       = float(edit.get('pdf_w', 50))
            h       = float(edit.get('pdf_h', 12))
            text    = edit.get('text', '')
            fs      = float(edit.get('font_size_pt', 12))
            deleted = edit.get('deleted', False)
            is_new  = edit.get('is_new', False)

            # ── Font resolution ────────────────────────────────────────────
            font_name = edit.get('font_name', 'Helvetica')
            is_bold   = edit.get('bold',     False)
            is_italic = edit.get('italic',   False)
            is_mono   = edit.get('is_mono',  False)
            is_serif  = edit.get('is_serif', False)

            pdf_fontname = resolve_pdf_fontname(font_name, is_bold, is_italic, is_mono, is_serif)

            # ── Color ──────────────────────────────────────────────────────
            hex_color = edit.get('color', '#000000').lstrip('#')
            try:
                cr = int(hex_color[0:2], 16) / 255.0
                cg = int(hex_color[2:4], 16) / 255.0
                cb = int(hex_color[4:6], 16) / 255.0
            except Exception:
                cr, cg, cb = 0.0, 0.0, 0.0

            # ── Step 1: White-out original bounding box ────────────────────
            if not is_new:
                erase_rect = fitz.Rect(x0 - 1, y0 - 1, x0 + w + 2, y0 + h + 2)
                page.add_redact_annot(erase_rect, fill=(1, 1, 1))
                page.apply_redactions()

            # ── Step 2: Insert new / replacement text ──────────────────────
            if not deleted:
                # PyMuPDF insert_text: point y = text BASELINE
                # Baseline ≈ top_of_span + font_size_pt (spans from top-left)
                baseline_y = y0 + fs
                page.insert_text(
                    (x0, baseline_y),
                    text,
                    fontsize=fs,
                    fontname=pdf_fontname,   # ← correct matched font
                    color=(cr, cg, cb),
                )

        output_path, _ = generate_safe_path("pdf")
        doc.save(output_path, garbage=4, deflate=True, clean=True)
        doc.close()

        return send_file_and_clean(output_path, "edited_document.pdf")

    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500




@app.route('/edit-direct', methods=['POST'])
def edit_direct():
    """Legacy endpoint — redirects to apply-edits for backward compatibility."""
    return apply_edits()




@app.route('/regenerate-pdf', methods=['POST'])
def regenerate_pdf():
    try:
        data = request.json
        pages_text = data.get('pages', []) # List of strings per page
        
        if not pages_text:
            return jsonify({"error": "No pages text provided."}), 400
            
        output_path, _ = generate_safe_path("pdf")
        
        c = canvas.Canvas(output_path, pagesize=letter)
        width, height = letter
        
        for text in pages_text:
            textobject = c.beginText()
            textobject.setTextOrigin(50, height - 50)
            textobject.setFont("Helvetica", 12)
            
            # Simple text wrapping (reportlab doesn't perfectly wrap automatically in basic mode)
            lines = text.split('\n')
            for line in lines:
                # Wrap long lines roughly based on width
                split_lines = simpleSplit(line, "Helvetica", 12, width - 100)
                for split_line in split_lines:
                    textobject.textLine(split_line)
                    
            c.drawText(textobject)
            c.showPage()
            
        c.save()
            
        return send_file_and_clean(output_path, "regenerated.pdf")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV', 'development') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
