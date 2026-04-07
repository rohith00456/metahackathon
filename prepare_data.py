import json
import os
import pdfplumber
import openpyxl

PDF_FOLDER  = r"F:\chat gpt data"
OUTPUT_FILE = r"F:\chat gpt data\rizer_dataset.jsonl"
CHUNK_SIZE  = 512

def extract_pdf(path):
    text = ""
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
    except Exception as e:
        print(f"  ⚠️ PDF error: {e}")
    return text.strip()

def extract_xlsx(path):
    text = ""
    try:
        wb = openpyxl.load_workbook(path, data_only=True)
        for sheet in wb.worksheets:
            for row in sheet.iter_rows(values_only=True):
                row_text = " ".join(str(c) for c in row if c is not None)
                if row_text.strip():
                    text += row_text + "\n"
    except Exception as e:
        print(f"  ⚠️ XLSX error: {e}")
    return text.strip()

def chunk_text(text, size=CHUNK_SIZE):
    words = text.split()
    chunks, current, length = [], [], 0
    for word in words:
        current.append(word)
        length += 1
        if length >= size:
            chunks.append(" ".join(current))
            current, length = [], 0
    if current:
        chunks.append(" ".join(current))
    return chunks

# MAIN
all_files = [f for f in os.listdir(PDF_FOLDER)
             if f.lower().endswith(".pdf") or f.lower().endswith(".xlsx")]

print(f"✅ Found {len(all_files)} files")
print(f"   PDFs : {sum(1 for f in all_files if f.lower().endswith('.pdf'))}")
print(f"   XLSX : {sum(1 for f in all_files if f.lower().endswith('.xlsx'))}")
print(f"   Output → {OUTPUT_FILE}\n")

total = 0
skipped = 0

with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    for filename in all_files:
        path = os.path.join(PDF_FOLDER, filename)
        print(f"📄 {filename}")

        if filename.lower().endswith(".pdf"):
            text = extract_pdf(path)
        else:
            text = extract_xlsx(path)

        if not text:
            print(f"  ❌ No text, skipping")
            skipped += 1
            continue

        chunks = chunk_text(text)
        for chunk in chunks:
            out.write(json.dumps({"text": chunk}, ensure_ascii=False) + "\n")
            total += 1

        print(f"  ✅ {len(chunks)} chunks added")

print(f"\n{'='*50}")
print(f"✅ DONE! {total} chunks saved → rizer_dataset.jsonl")
print(f"⚠️  {skipped} files skipped (no text)")