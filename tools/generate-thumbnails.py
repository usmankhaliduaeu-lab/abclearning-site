#!/usr/bin/env python3
"""
generate-thumbnails.py
Renders page 1 of every PDF in ../pdfs/ as a PNG thumbnail (~400px wide).
Uses Ghostscript — already installed with TeX Live 2025.

Usage (from abclearning-site/tools/):
    python generate-thumbnails.py

Re-run after adding new PDFs. Existing thumbnails are skipped.
Delete a thumbnail to force regeneration.
"""

import subprocess
import sys
from pathlib import Path

# ── Ghostscript candidates ────────────────────────────────────────────────────
GS_CANDIDATES = [
    r"C:\texlive\2025\bin\windows\rungs.exe",   # TeX Live 2025 (this machine)
    r"C:\texlive\2025\bin\windows\gswin64c.exe",
    r"C:\texlive\2025\bin\windows\gs.exe",
    "gswin64c",
    "gs",
]

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR    = Path(__file__).parent
SITE_DIR      = SCRIPT_DIR.parent
PDF_DIR       = SITE_DIR / "pdfs"
THUMB_DIR     = SITE_DIR / "thumbnails"

# 48 DPI → A4 (8.27 in) ≈ 397 px wide — good enough for card thumbnails
TARGET_DPI = 48

# ── Find Ghostscript ──────────────────────────────────────────────────────────
def find_gs():
    for candidate in GS_CANDIDATES:
        try:
            r = subprocess.run([candidate, "--version"],
                               capture_output=True, text=True, timeout=5)
            if r.returncode == 0:
                print(f"Ghostscript: {candidate}  (v{r.stdout.strip()})")
                return candidate
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    print("ERROR: Ghostscript not found.")
    sys.exit(1)

# ── Generate one thumbnail ────────────────────────────────────────────────────
def make_thumb(gs, pdf_path, out_path):
    cmd = [
        gs,
        "-dNOPAUSE", "-dBATCH", "-dSAFER", "-dQUIET",
        "-sDEVICE=png16m",
        f"-r{TARGET_DPI}",
        "-dFirstPage=1", "-dLastPage=1",
        f"-sOutputFile={out_path}",
        str(pdf_path),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  FAILED  {pdf_path.name}")
        if r.stderr:
            print(f"           {r.stderr[:200]}")
        return False
    return True

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    THUMB_DIR.mkdir(exist_ok=True)
    gs = find_gs()

    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs found in {PDF_DIR}")
        return

    print(f"\nProcessing {len(pdfs)} PDFs -> {THUMB_DIR}\n")
    ok = skip = fail = 0

    for pdf in pdfs:
        out = THUMB_DIR / (pdf.stem + ".png")
        if out.exists():
            print(f"  skip  {pdf.name}")
            skip += 1
            continue
        print(f"  ...   {pdf.name}", end="  ", flush=True)
        if make_thumb(gs, pdf, out):
            kb = out.stat().st_size // 1024
            print(f"OK  ({kb} KB)")
            ok += 1
        else:
            fail += 1

    print(f"\nDone — {ok} generated, {skip} skipped, {fail} failed.")

if __name__ == "__main__":
    main()
