#!/usr/bin/env python3
"""
Cloud Prep Hub content pipeline.

Reads the study content we write by hand in `content/` (YAML and Markdown),
validates it, and generates the JSON files the website loads from `site/data/`.

Usage:
    python scripts/build.py            # validate and build
    python scripts/build.py --check    # validate only (used in CI)

Why a build step?
    Writing questions in YAML and notes in Markdown is much easier to review in
    a pull request than editing JSON or HTML by hand. The script also catches
    mistakes (a missing answer, a duplicate id, a typo in a domain name) before
    they ever reach the live site.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import markdown
import yaml

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content"
OUTPUT_DIR = ROOT / "site" / "data"

OPTIONS_PER_QUESTION = 4
WORDS_PER_MINUTE = 200


class ContentError(Exception):
    """Raised when the content fails validation."""

    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__(f"{len(errors)} content error(s) found")


# --------------------------------------------------------------------------- #
# Loading
# --------------------------------------------------------------------------- #
def read_yaml(path: Path):
    with path.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle) or []


def load_domains(content_dir: Path = CONTENT_DIR) -> list[dict]:
    return read_yaml(content_dir / "domains.yaml")


def load_questions(content_dir: Path = CONTENT_DIR) -> list[dict]:
    """Load every questions/<domain>.yaml file. The file name sets the domain."""
    questions = []
    for path in sorted((content_dir / "questions").glob("*.yaml")):
        for item in read_yaml(path):
            item["domain"] = path.stem
            questions.append(item)
    return questions


def load_flashcards(content_dir: Path = CONTENT_DIR) -> list[dict]:
    return read_yaml(content_dir / "flashcards.yaml")


def load_notes(content_dir: Path = CONTENT_DIR) -> dict[str, str]:
    """Return {domain_id: markdown_text} for every notes/<domain>.md file."""
    return {
        path.stem: path.read_text(encoding="utf-8")
        for path in sorted((content_dir / "notes").glob("*.md"))
    }


# --------------------------------------------------------------------------- #
# Validation
# --------------------------------------------------------------------------- #
def validate_domains(domains: list[dict]) -> list[str]:
    errors = []
    required = {"id", "number", "name", "weight", "colour", "summary"}
    for domain in domains:
        missing = required - domain.keys()
        if missing:
            errors.append(f"Domain {domain.get('id', '?')}: missing {sorted(missing)}")
    total = sum(d.get("weight", 0) for d in domains)
    if total != 100:
        errors.append(f"Domain weights add up to {total}, expected 100")
    return errors


def validate_questions(questions: list[dict], domain_ids: set[str]) -> list[str]:
    errors = []
    seen_ids: set[str] = set()
    for q in questions:
        qid = q.get("id", "<no id>")
        for field in ("id", "question", "options", "answer", "explanation"):
            if field not in q or q[field] in (None, ""):
                errors.append(f"{qid}: missing '{field}'")

        if qid in seen_ids:
            errors.append(f"{qid}: duplicate id")
        seen_ids.add(qid)

        if q.get("domain") not in domain_ids:
            errors.append(f"{qid}: unknown domain '{q.get('domain')}'")

        options = q.get("options") or []
        if len(options) != OPTIONS_PER_QUESTION:
            errors.append(f"{qid}: has {len(options)} options, expected {OPTIONS_PER_QUESTION}")
        if len(set(map(str, options))) != len(options):
            errors.append(f"{qid}: options must be unique")

        answer = q.get("answer")
        if not isinstance(answer, int) or not 0 <= answer < len(options):
            errors.append(f"{qid}: answer must be a number from 0 to {len(options) - 1}")
    return errors


def validate_flashcards(cards: list[dict], domain_ids: set[str]) -> list[str]:
    errors = []
    seen_ids: set[str] = set()
    for card in cards:
        cid = card.get("id", "<no id>")
        for field in ("id", "domain", "term", "definition"):
            if not card.get(field):
                errors.append(f"{cid}: missing '{field}'")
        if cid in seen_ids:
            errors.append(f"{cid}: duplicate id")
        seen_ids.add(cid)
        if card.get("domain") not in domain_ids:
            errors.append(f"{cid}: unknown domain '{card.get('domain')}'")
    return errors


def validate_notes(notes: dict[str, str], domain_ids: set[str]) -> list[str]:
    errors = []
    for domain_id in sorted(domain_ids - notes.keys()):
        errors.append(f"notes/{domain_id}.md is missing")
    for domain_id in sorted(notes.keys() - domain_ids):
        errors.append(f"notes/{domain_id}.md does not match any domain")
    return errors


def validate_all(domains, questions, flashcards, notes) -> list[str]:
    domain_ids = {d["id"] for d in domains if "id" in d}
    return (
        validate_domains(domains)
        + validate_questions(questions, domain_ids)
        + validate_flashcards(flashcards, domain_ids)
        + validate_notes(notes, domain_ids)
    )


# --------------------------------------------------------------------------- #
# Transforming
# --------------------------------------------------------------------------- #
def render_note(text: str) -> dict:
    """Convert Markdown to HTML and collect the section headings for a contents list."""
    md = markdown.Markdown(extensions=["tables", "toc", "sane_lists"])
    html = md.convert(text)

    # Style "Exam tip" quotes as callouts and open external links in a new tab.
    html = html.replace("<blockquote>", '<blockquote class="callout">')
    html = html.replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")
    html = re.sub(r'<a href="(https?://[^"]+)"', r'<a href="\1" target="_blank" rel="noopener"', html)

    toc = [{"id": t["id"], "title": t["name"]} for t in md.toc_tokens]
    words = len(re.findall(r"\w+", text))
    return {
        "html": html,
        "toc": toc,
        "words": words,
        "readMinutes": max(1, math.ceil(words / WORDS_PER_MINUTE)),
    }


def git_commit() -> str:
    """Short commit hash: from GitHub Actions if available, otherwise from git."""
    if os.environ.get("GITHUB_SHA"):
        return os.environ["GITHUB_SHA"][:7]
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=ROOT, capture_output=True, text=True, check=True,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "local"


def build_meta(domains, questions, flashcards, notes_out) -> dict:
    per_domain = {
        d["id"]: {
            "questions": sum(q["domain"] == d["id"] for q in questions),
            "flashcards": sum(c["domain"] == d["id"] for c in flashcards),
            "readMinutes": notes_out[d["id"]]["readMinutes"],
        }
        for d in domains
    }
    return {
        "totals": {
            "domains": len(domains),
            "questions": len(questions),
            "flashcards": len(flashcards),
            "readMinutes": sum(n["readMinutes"] for n in notes_out.values()),
        },
        "perDomain": per_domain,
        "builtAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "commit": git_commit(),
    }


# --------------------------------------------------------------------------- #
# Main build
# --------------------------------------------------------------------------- #
def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def build(content_dir: Path = CONTENT_DIR, output_dir: Path = OUTPUT_DIR, check_only=False) -> dict:
    domains = load_domains(content_dir)
    questions = load_questions(content_dir)
    flashcards = load_flashcards(content_dir)
    notes = load_notes(content_dir)

    errors = validate_all(domains, questions, flashcards, notes)
    if errors:
        raise ContentError(errors)

    notes_out = {domain_id: render_note(text) for domain_id, text in notes.items()}
    meta = build_meta(domains, questions, flashcards, notes_out)

    if not check_only:
        output_dir.mkdir(parents=True, exist_ok=True)
        write_json(output_dir / "domains.json", domains)
        write_json(output_dir / "questions.json", questions)
        write_json(output_dir / "flashcards.json", flashcards)
        write_json(output_dir / "notes.json", notes_out)
        write_json(output_dir / "meta.json", meta)
    return meta


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate and build Cloud Prep Hub content.")
    parser.add_argument("--check", action="store_true", help="validate only, don't write files")
    parser.add_argument("--content", type=Path, default=CONTENT_DIR, help="content folder")
    parser.add_argument("--out", type=Path, default=OUTPUT_DIR, help="output folder for JSON")
    args = parser.parse_args(argv)

    try:
        meta = build(args.content, args.out, check_only=args.check)
    except ContentError as exc:
        print(f"✗ {exc}:", file=sys.stderr)
        for error in exc.errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    totals = meta["totals"]
    action = "Validated" if args.check else f"Built into {args.out.relative_to(ROOT) if args.out.is_relative_to(ROOT) else args.out}"
    print(f"✓ {action}: {totals['questions']} questions, {totals['flashcards']} flashcards, "
          f"{totals['domains']} domains of notes (~{totals['readMinutes']} min read)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
