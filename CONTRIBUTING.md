
---

# Contributing to FlowFi

Thank you for your interest in contributing to **FlowFi**

FlowFi is a DeFi payment streaming protocol built on Stellar using Soroban smart contracts. This guide explains how to set up your local development environment and contribute effectively.

Please read this document carefully before opening a Pull Request.

---

##  Table of Contents

* [Project Overview](#project-overview)
* [Local Development Setup](#local-development-setup)
* [Branching Strategy](#branching-strategy)
* [Commit Guidelines & Hooks](#commit-guidelines--hooks)
* [Pull Request Process](#pull-request-process)
* [Code of Conduct](#code-of-conduct)

---

##  Project Overview

FlowFi is structured as a monorepo:

```
flowfi/
├── backend/      # Express.js + TypeScript backend
├── contracts/    # Soroban smart contracts (Rust)
├── frontend/     # Next.js + Tailwind CSS frontend
```

Technologies used:

* **Frontend**: Next.js + TypeScript + Tailwind CSS
* **Backend**: Express.js + TypeScript
* **Smart Contracts**: Rust + Soroban
* **Database**: PostgreSQL
* **Containerization**: Docker & Docker Compose

---

#  Local Development Setup


##  Fork & Clone the Repository

Fork & Clone the Repository

First, fork the repository on GitHub.

Then clone your fork locally:

```bash
git clone https://github.com/YOUR-USERNAME/flowfi.git
cd flowfi
```

##  Prerequisites

Make sure you have the following installed:

* Node.js (LTS recommended)
* npm
* Rust & Cargo
* Docker & Docker Compose
* (Optional) Stellar CLI

---

##  Option 1: Docker (Recommended)

The fastest way to run the full stack locally:

```bash
docker compose up --build
```

This starts:

* PostgreSQL (port 5432)
* Backend API (port 3001)

To run in detached mode:

```bash
docker compose up -d --build
```

To stop services:

```bash
docker compose down
```

To reset the database:

```bash
docker compose down -v
```

---

##  Option 2: Manual Setup

###  Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on:

```
http://localhost:3001
```

---

### 2️ Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```
http://localhost:3000
```

---

### 3️ Smart Contracts

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
```

---

#  Branching Strategy

❌ Do NOT commit directly to `main`
✅ Always create a feature branch

## Branch Naming Convention

| Type     | Format                       | Example                       |
| -------- | ---------------------------- | ----------------------------- |
| Feature  | `feature/short-description`  | `feature/add-stream-cancel`   |
| Bug Fix  | `fix/short-description`      | `fix/dashboard-loading-error` |
| Refactor | `refactor/short-description` | `refactor/api-service-layer`  |
| Docs     | `docs/short-description`     | `docs/update-contributing`    |
| Infra    | `infra/short-description`    | `infra/docker-improvement`    |

## Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Keep branch names short and descriptive.

---

#  Commit Guidelines & Hooks

This repository uses **Husky** for commit hooks.

Before committing, ensure:

* Code compiles
* Lint passes
* No broken builds

## Commit Message Format

We follow a conventional style:

```
type(scope): short description
```

### Examples

```
feat(frontend): add wallet balance card
fix(backed): resolve stream validation bug
refactor(contracts): simplify transfer logic
docs: update setup instructions
```

## Commit Rules

* Use present tense ("add", not "added")
* Keep subject under ~72 characters
* Make atomic commits (one logical change per commit)
* Avoid vague messages like "update stuff"

---

#  Pull Request Process

##  Sync with Main

Before opening a PR:

```bash
git checkout main
git pull origin main
git checkout your-branch
git rebase main
```

Resolve conflicts locally if any.

---

##  Push Your Branch

```bash
git push origin your-branch-name
```

---

## 3 Open a Pull Request

When opening your PR:

* Provide a clear title
* Add a detailed description
* Link related issues (e.g., `Closes #45`)
* Add screenshots for UI changes
* Explain why the change is needed

---

##  PR Requirements

Your PR must:

* Build successfully
* Pass lint checks
* Follow commit conventions
* Be properly described
* Stay focused (avoid large unrelated changes)

---

##  Code Review

Maintainers may:

* Request changes
* Ask clarifying questions
* Suggest improvements

Please respond respectfully and update your branch as requested.

---

# 📜 Code of Conduct

This project follows a Code of Conduct to ensure a welcoming and inclusive community.

Please read and follow our Code of Conduct before contributing:

 **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)**

Be respectful.
Be collaborative.
Be constructive.

---

#  Final Notes

* Contributions of all sizes are welcome
* Documentation improvements are valuable
* Ask questions in Issues if unsure
* Keep PRs small and manageable

Thank you for helping improve FlowFi 💙
