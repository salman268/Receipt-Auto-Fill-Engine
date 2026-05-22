# Receipt Auto-Fill Engine

A multimodal web app built for high-throughput receipt data extraction. Developed as an assessment for the TP Innovation Team.

## Architecture & Approach

This tool was designed specifically for BPO finance workflows. Instead of a basic single-file uploader, it handles batch processing and features a custom "Confidence Engine" that scores the AI's extraction accuracy, flagging uncertain fields for human review.

**MVP Scope:** To ensure a frictionless setup for reviewers and align with actual finance operations (which run on spreadsheets), this V1 uses in-memory state and outputs directly to a formatted CSV with an audit trail. 

**Roadmap (V2):** Wire state to a PostgreSQL database (via Supabase/Prisma) to track extraction analytics and team throughput over time.

## Tech Stack

- **Framework:** Next.js 14 (App Router)

- **UI:** Tailwind CSS + shadcn/ui

- **AI Pipeline:** GPT-4o (via GitHub Models API) configured for strict JSON schema extraction

- **Data Handling:** Papaparse for client-side CSV generation

## Core Features

- **Batch Processing:** Drop multiple `.jpg`, `.png`, or `.jfif` files to process them in parallel.

- **Confidence Engine:** The AI self-reports extraction accuracy. Uncertain fields are visually flagged (amber/red) to mandate human verification.

- **Audit Trail:** Modifying an AI-extracted value tags the field as "EDITED" in the UI and tracks the manual override in the final CSV export.

## Local Setup

1. Install dependencies:

```bash

npm install  
  
2. Create a `.env.local` file in the root directory and add your GitHub Personal Access Token (used for the free GPT-4o inference endpoint):  
  
GITHUB_TOKEN=your_github_token_here  
  
  
3. Boot the development server:  
  
npm run dev  
  
Open `http://localhost:3000` to view the dashboard