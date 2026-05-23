# Receipt Auto-Fill Engine

A high-throughput, multimodal data extraction pipeline. 

The goal of this project is to eliminate manual data entry in BPO finance workflows. Instead of relying on traditional OCR, this application uses Vision LLMs to read, parse, and structure batch receipt data while enforcing a strict human-in-the-loop review system.

**Live Application:** [[Click here to test the live Vercel deployment](https://vercel.com/salman268s-projects/receipt-auto-fill-engine)]

*If you need to copy the URL directly:*  
[https://vercel.com/salman268s-projects/receipt-auto-fill-engine](https://vercel.com/salman268s-projects/receipt-auto-fill-engine)  
  
##  Model & AI Prompt Used

- **AI Infrastructure:** `GPT-4o` (Accessed via GitHub Models API)

- **System Prompt:** > "You are an enterprise finance data extraction system. Analyze this receipt image and extract the following fields in strict JSON format: merchant, date, totalAmount, and currency. If a field is completely illegible or missing from the image, you must return null. Do not hallucinate data. Evaluate your visual certainty and rate your confidence for each extracted field as 'high', 'medium', or 'low'."  


## Architecture & Approach

This tool was engineered specifically for BPO finance workflows. Instead of a basic single-file uploader, it handles batch processing and features a custom **Confidence Engine** that scores the AI's extraction accuracy, visually flagging uncertain fields for mandatory human review.

To ensure UI stability and counter LLM data hallucinations, the app uses an **Event-Driven Audit Trail**. It strictly tracks user keyboard inputs rather than relying on standard string comparisons, ensuring the "EDITED" flag only triggers on actual human intervention.

*⚠️ Note for Reviewers regarding the Live Demo: The Vercel deployment is currently using a free-tier GitHub Personal Access Token, which has a strict rate limit of 50 requests per day. If you encounter a 500 error during heavy testing, it means the daily limit has been reached. You can easily run the application locally using your own token by following the local setup steps below.*  
  
  
## Tech Stack  
  
- **Framework:** Next.js 14 (App Router)  
- **UI:** Tailwind CSS + shadcn/ui  
- **AI Pipeline:** GPT-4o (via GitHub Models API) configured for strict JSON schema extraction  
- **Data Handling:** Papaparse for client-side CSV generation  
  
## Future Roadmap (V2)

Future production iterations will implement PostgreSQL (via Supabase/Prisma) for database persistence and analytics, NextAuth for role-based access control, and automated AWS S3 cloud storage for compliance auditing.  
  
## Core Features  
  
- **Batch Processing:** Drop multiple `.jpg`, `.png`, or `.jfif` files to process them in parallel.  
- **Confidence Engine:** The AI self-reports extraction accuracy. Uncertain fields are visually flagged (amber/red) to mandate human verification.  
- **Audit Trail:** Modifying an AI-extracted value tags the field as "EDITED" in the UI and tracks the manual override in the final CSV export.  
  


## How to Run it Locally

If you wish to clone this project and run it on your own machine, follow these steps:

### 1. Clone & Install

Copy and run these commands in your terminal:

```bash

git clone [https://github.com/salman268/Receipt-Auto-Fill-Engine.git](https://github.com/salman268/Receipt-Auto-Fill-Engine.git)

```

Bash

```
cd Receipt-Auto-Fill-Engine
```

Bash

```
npm install
```

### 2. Configure Environment Variables

Create a file named `.env.local` in the root directory. You will need a GitHub Personal Access Token (ensure you have agreed to the Copilot/Models Terms of Service on your GitHub account). Paste your token inside:

GITHUB_TOKEN=your_github_token_here  
  
3. Boot the Server

Start the Next.js development server:

Bash

```
npm run dev
```

  
  
Finally, open **[http://localhost:3000](http://localhost:3000)** in your browser to view the dashboard and test the batch processing pipeline.

  


