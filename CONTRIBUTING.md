# Contributing to Cloud Prep Hub

We use a simple **feature-branch workflow**. Nobody pushes straight to `main`: every change goes through a pull request and is reviewed by the other person.

## The everyday workflow

```bash
# 1. Start from the latest main
git checkout main
git pull

# 2. Create a branch for your change
git checkout -b content/security-questions     # or feature/..., fix/..., docs/...

# 3. Make your changes, then check them
pytest
python scripts/build.py
python -m http.server 8000 -d site              # open http://localhost:8000

# 4. Commit and push
git add .
git commit -m "Add 5 security questions about encryption"
git push -u origin content/security-questions
```

5. Open a **Pull Request** on GitHub. The template asks for a short summary and a checklist.
6. Wait for the green ✅ from GitHub Actions.
7. Your teammate reviews it: comments, requests changes or approves.
8. Merge, then delete the branch. The site deploys automatically.

## Branch names

| Prefix | Use for |
|---|---|
| `content/` | Questions, flashcards, notes |
| `feature/` | New website functionality |
| `fix/` | Bug fixes |
| `docs/` | README and other docs |
| `ci/` | GitHub Actions changes |

## Commit messages

Write them in the imperative, as if completing "This commit will…":

- ✅ `Add Spot Instance flashcard`
- ✅ `Fix timer not stopping after submit`
- ❌ `changes`, `stuff`, `final version 2`

## Adding content

### A quiz question

Add it to the right file in `content/questions/` (the file name is the domain):

```yaml
- id: sec-013                 # unique: prefix + next number
  question: Which service stores and automatically rotates database passwords?
  options:
    - AWS Secrets Manager
    - AWS KMS
    - AWS Artifact
    - Amazon Macie
  answer: 0                   # index of the correct option, starting at 0
  explanation: AWS Secrets Manager stores secrets and can rotate them automatically.
```

### A flashcard

Add it to `content/flashcards.yaml` with a `domain` that matches `content/domains.yaml`.

### Notes

Edit the Markdown file for the domain in `content/notes/`. Use `##` for sections (they appear in the "On this page" list) and start a quote with `> **Exam tip:**` to create a highlighted tip box.

If anything is wrong (a missing answer, a duplicate id, an unknown domain), `pytest` and the build script tell you exactly what to fix.

## Reviewing a pull request

- Check facts against the official AWS docs.
- Pull the branch and try it locally if it changes the website.
- Leave at least one comment, even if it's "Looks good because…".
- Be kind and specific: suggest, don't demand.
