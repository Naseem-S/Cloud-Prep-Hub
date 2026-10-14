"""
Tests for the Cloud Prep Hub content and build script.

Run them with:  pytest
GitHub Actions runs them on every pull request, so a broken question can't be
merged into main.
"""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import build  # noqa: E402


# ---------- Fixtures: load the real content once per test session ----------
@pytest.fixture(scope="session")
def domains():
    return build.load_domains()


@pytest.fixture(scope="session")
def domain_ids(domains):
    return {d["id"] for d in domains}


@pytest.fixture(scope="session")
def questions():
    return build.load_questions()


@pytest.fixture(scope="session")
def flashcards():
    return build.load_flashcards()


@pytest.fixture(scope="session")
def notes():
    return build.load_notes()


# ---------- Tests on the real content ----------
def test_there_are_four_exam_domains(domains):
    assert len(domains) == 4


def test_domain_weights_add_up_to_100(domains):
    assert build.validate_domains(domains) == []


def test_every_question_is_valid(questions, domain_ids):
    assert build.validate_questions(questions, domain_ids) == []


def test_every_flashcard_is_valid(flashcards, domain_ids):
    assert build.validate_flashcards(flashcards, domain_ids) == []


def test_every_domain_has_notes(notes, domain_ids):
    assert build.validate_notes(notes, domain_ids) == []


@pytest.mark.parametrize("domain_id", ["cloud-concepts", "security", "technology", "billing"])
def test_each_domain_has_enough_questions(questions, domain_id):
    count = sum(q["domain"] == domain_id for q in questions)
    assert count >= 5, f"{domain_id} only has {count} questions"


def test_question_ids_are_unique_across_all_files(questions):
    ids = [q["id"] for q in questions]
    assert len(ids) == len(set(ids))


# ---------- Tests that the validators catch mistakes ----------
def test_validator_catches_answer_out_of_range(domain_ids):
    bad = [{
        "id": "x-1", "domain": "security", "question": "Q?",
        "options": ["a", "b", "c", "d"], "answer": 4, "explanation": "E",
    }]
    errors = build.validate_questions(bad, domain_ids)
    assert any("answer must be" in e for e in errors)


def test_validator_catches_wrong_number_of_options(domain_ids):
    bad = [{
        "id": "x-2", "domain": "security", "question": "Q?",
        "options": ["a", "b"], "answer": 0, "explanation": "E",
    }]
    errors = build.validate_questions(bad, domain_ids)
    assert any("expected 4" in e for e in errors)


def test_validator_catches_unknown_domain():
    bad = [{"id": "fc-x", "domain": "not-a-domain", "term": "T", "definition": "D"}]
    errors = build.validate_flashcards(bad, {"security"})
    assert any("unknown domain" in e for e in errors)


def test_validator_catches_duplicate_ids(domain_ids):
    card = {"id": "dup", "domain": "security", "term": "T", "definition": "D"}
    errors = build.validate_flashcards([card, dict(card)], domain_ids)
    assert any("duplicate" in e for e in errors)


# ---------- Tests on the build output ----------
def test_render_note_builds_contents_and_callouts():
    result = build.render_note("## Heading one\n\n> **Exam tip:** remember this\n")
    assert result["toc"] == [{"id": "heading-one", "title": "Heading one"}]
    assert 'class="callout"' in result["html"]
    assert result["readMinutes"] >= 1


def test_full_build_writes_all_json_files(tmp_path):
    meta = build.build(output_dir=tmp_path)
    for name in ("domains", "questions", "flashcards", "notes", "meta"):
        assert (tmp_path / f"{name}.json").exists()

    saved = json.loads((tmp_path / "meta.json").read_text())
    assert saved["totals"] == meta["totals"]
    assert saved["totals"]["questions"] > 0


def test_build_fails_on_bad_content(tmp_path):
    content = tmp_path / "content"
    (content / "questions").mkdir(parents=True)
    (content / "notes").mkdir()
    (content / "domains.yaml").write_text(
        "- {id: a, number: 1, name: A, weight: 50, colour: '#000', summary: s}\n"
    )
    (content / "flashcards.yaml").write_text("[]\n")
    (content / "notes" / "a.md").write_text("## A\n")

    with pytest.raises(build.ContentError) as exc:
        build.build(content_dir=content, output_dir=tmp_path / "out")
    assert any("add up to 50" in e for e in exc.value.errors)
