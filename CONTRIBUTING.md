# 🤝 How to Contribute to Vir_RAG_assistant

Welcome! This guide is written for **complete beginners** — you don't need to know Git deeply. Just follow each step carefully.

---

## 📌 What is this project?

**Vir_RAG_assistant** is a multi-assistant project to help students with college-related queries.

> GitHub Repo: https://github.com/TNlucfer01/Vir_RAG_assistant

---

## 🛠️ Step 0: Install Required Tools

Before you start, make sure these are installed on your computer:

### Git
- Download from: https://git-scm.com/downloads
- After installing, open your terminal (or Command Prompt on Windows) and run:
  ```bash
  git --version
  ```
  You should see something like: `git version 2.x.x`

### GitHub Account
- Create a free account at: https://github.com

---

## 🔁 Step 1: Fork the Repository

**Forking** creates your own personal copy of the project on GitHub.

1. Go to: https://github.com/TNlucfer01/Vir_RAG_assistant
2. Click the **"Fork"** button at the top-right corner of the page.
3. Click **"Create fork"**.
4. You now have your own copy at: `https://github.com/YOUR_USERNAME/Vir_RAG_assistant`

---

## 💾 Step 2: Clone Your Fork to Your Computer

**Cloning** downloads the project to your local machine.

1. Go to **your forked repo** on GitHub (`https://github.com/YOUR_USERNAME/Vir_RAG_assistant`).
2. Click the green **"<> Code"** button.
3. Copy the HTTPS URL (looks like: `https://github.com/YOUR_USERNAME/Vir_RAG_assistant.git`).
4. Open your terminal and run:

```bash
git clone https://github.com/YOUR_USERNAME/Vir_RAG_assistant.git
```

5. Move into the project folder:
```bash
cd Vir_RAG_assistant
```

---

## 🌿 Step 3: Create a New Branch

**Always work on a new branch**, never directly on `main`. This keeps things clean.

```bash
git checkout -b your-branch-name
```

**Name your branch clearly**, for example:
- `add-kb-r2025-regulations`
- `add-attendance-faq`
- `fix-typo-in-readme`

Example:
```bash
git checkout -b add-r2025-knowledge-base
```

---

## ✏️ Step 4: Create Your Own Folder and Add Your Documents

### 🗂️ Create Your Personal Folder

Every contributor must create a **folder named after themselves** inside the `Aathi/` directory. This keeps everyone's work organized and easy to find.

**Folder naming rule:** Use your name in lowercase, with underscores for spaces.

Examples:
- `Aathi/ravi_kumar/`
- `Aathi/priya_s/`
- `Aathi/john_doe/`

To create your folder, run this in your terminal (inside the project directory):

```bash
mkdir -p Aathi/your_name
```

Example:
```bash
mkdir -p Aathi/ravi_kumar
```

> ⚠️ **Important:** Never place your files directly inside `Aathi/`. Always put them inside **your own folder**.

---

### 📄 Add Your Documents Inside Your Folder

Now place all your files inside your folder. Here are the types of contributions:

### Type A: Knowledge Base (KB) Documents — `.md` files
- These are the most important contributions for the RAG assistant.
- Write them in **Markdown format** (`.md`).
- Look at `Aathi/knowledge_base_UG_regulations_2021.md` as a reference.
- Example filenames:
  - `Aathi/ravi_kumar/knowledge_base_R2025_regulations.md`
  - `Aathi/ravi_kumar/faq_attendance_rules.md`
  - `Aathi/ravi_kumar/knowledge_base_exam_procedures.md`

### Type B: PDF / Excel / Word Documents
- Place PDFs, Excel sheets, or Word documents inside your folder.
- Example:
  - `Aathi/priya_s/R2025_academic_regulation.pdf`
  - `Aathi/priya_s/5th_sem_timetable.xlsx`

### Type C: Fixing Mistakes in Existing Files
- Open the file with the error, correct it, and save it in its original location.

---

### ✅ Content Guidelines
- Use **plain English** — the RAG assistant needs to understand the content.
- Break content into **short, clear paragraphs** with proper headings.
- Use **tables** for rules, marks, credits, etc.
- **Do NOT include personal/sensitive student data** (names, register numbers, individual grades).
- Each `.md` file should focus on **one topic** (e.g., one file for attendance rules, another for exam procedures).

---

## 💾 Step 5: Save Your Changes with Git

After making your changes, you need to **stage and commit** them.

### Check what files you changed:
```bash
git status
```

### Add your changed files:
```bash
git add .
```
(The `.` adds ALL changed files. Or specify a single file: `git add Aathi/your-file.md`)

### Commit with a meaningful message:
```bash
git commit -m "Add knowledge base for R2025 academic regulations"
```

**Good commit message examples:**
- `Add knowledge base for R2025 regulations`
- `Add IT 2023-2027 5th sem attendance data`
- `Fix typo in UG regulations KB`

**Bad commit messages (avoid):**
- `update`
- `changes`
- `done`

---

## 🚀 Step 6: Push Your Branch to GitHub

**Push** your branch from your computer up to your GitHub fork:

```bash
git push origin your-branch-name
```

Example:
```bash
git push origin add-r2025-knowledge-base
```

---

## 📬 Step 7: Create a Pull Request (PR)

A **Pull Request (PR)** is how you ask the project owner to include your changes.

1. Go to your forked repo on GitHub.
2. You'll see a yellow banner: **"Compare & pull request"** — click it.
3. Fill in the form:
   - **Title:** A clear summary of your changes (e.g., `Add R2025 Academic Regulations KB`)
   - **Description:** Explain what you added/changed and why.
4. Make sure it says: **base: `TNlucfer01/Vir_RAG_assistant` ← compare: `your-branch-name`**
5. Click **"Create pull request"**.

The project owner (Aathi) will review your PR and either approve or request changes.

---

## 🔄 Step 8: Keep Your Fork Updated (Important!)

If the original repo gets updated, your fork can fall behind. Keep it in sync:

### Add the original repo as "upstream":
```bash
git remote add upstream https://github.com/TNlucfer01/Vir_RAG_assistant.git
```

### Pull the latest changes from upstream:
```bash
git fetch upstream
git checkout main
git merge upstream/main
```

### Push the updated main to your fork:
```bash
git push origin main
```

---

## 📁 Project Folder Structure

```
Vir_RAG_assistant/
├── README.md                               ← Project overview
├── CONTRIBUTING.md                         ← This file!
├── LICENSE                                 ← License info
├── .gitignore                              ← Files Git ignores
├── Undergraduate Programme - Academic Regulations 2021.pdf
├── Campus_Assistant_Feasibility_POC.docx
└── Aathi/                                  ← Main working folder
    │
    ├── knowledge_base_UG_regulations_2021.md   ← Existing KB (R2021)
    ├── Undergraduate Programme - Academic Regulations 2021.pdf
    ├── R2025 accadmeic regulation.pdf
    │
    ├── IT 2023 2027/                       ← Existing batch data
    │   ├── IAT-2 second sem.xlsx
    │   ├── III IT BATCH 2023-2027 RA-2025 ODD 5th-SEM.xlsx
    │   ├── IT batch 2023 2027 5th sem attendance.xlsx
    │   └── IT batch 2023-2027 3thsem result analysis.xlsx
    │
    ├── your_name/                          ← 🆕 YOUR personal folder
    │   ├── knowledge_base_topic_name.md
    │   ├── some_document.pdf
    │   └── any_other_file.xlsx
    │
    ├── ravi_kumar/                         ← Another contributor's folder
    │   └── knowledge_base_R2025.md
    │
    └── priya_s/                            ← Another contributor's folder
        └── faq_exam_procedures.md
```

> 🔑 **Rule:** Every contributor gets their own folder. Your folder = your name. All your files go inside it.

---

## ✅ Contribution Checklist

Before submitting your Pull Request, make sure:

- [ ] I created a new branch (not working on `main`)
- [ ] I created **my own folder** inside `Aathi/` named after me (e.g., `Aathi/ravi_kumar/`)
- [ ] All my files are placed **inside my personal folder**, not directly in `Aathi/`
- [ ] My KB `.md` files use clear headings, tables, and bullet points
- [ ] No personal student data included (names, reg. numbers, individual grades)
- [ ] My commit message clearly describes what I did
- [ ] My PR title and description are clear

---

## ❓ Common Mistakes & Fixes

| Problem | Fix |
|---|---|
| `git push` is rejected | Run `git pull origin main` first, then push again |
| Wrong branch | Run `git checkout -b correct-branch-name` |
| Accidentally edited `main` | Create a new branch from your changes: `git checkout -b new-branch` |
| Forgot to fork first | Fork the repo, then re-clone from YOUR fork |
| Git asks for password on push | Use a [Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) instead of your password |

---

## 💬 Need Help?

If you're stuck at any step:
- Ask **Aathi** (project owner) directly.
- Open a **GitHub Issue**: Go to the repo → "Issues" tab → "New Issue".
- Reference: https://docs.github.com/en/get-started/quickstart/contributing-to-projects

---

*Happy contributing! 🚀*
