# NextFlow - Visual Workflow Builder

A pixel-perfect clone of [Krea.ai's](https://krea.ai) workflow builder, built as part of the Galaxy.ai Full-Stack Developer Assignment.

![NextFlow Screenshot](https://via.placeholder.com/800x400?text=NextFlow+Workflow+Builder)

## Overview

NextFlow is a visual workflow builder that allows users to create, manage, and execute AI-powered workflows using a drag-and-drop interface. Built with modern web technologies, it provides a seamless experience for constructing complex data pipelines with various node types.

## Features

### Core Functionality

- **Visual Canvas** - Intuitive drag-and-drop interface with dotted grid background
- **6 Node Types** - Text, Upload Image, Upload Video, Run Any LLM, Crop Image, Extract Frame
- **Type-Safe Connections** - Smart edge validation (image→image, video→video, text→text)
- **DAG Validation** - Automatic cycle detection prevents invalid circular workflows
- **Parallel Execution** - Independent branches run concurrently for optimal performance

### Workflow Management

- **Save/Load Workflows** - Persist workflows to PostgreSQL database
- **Import/Export JSON** - Share workflows via JSON files
- **Sample Workflow** - Pre-built "Product Marketing Kit Generator" demonstrating all features
- **Undo/Redo** - Full history support with keyboard shortcuts (Cmd+Z / Cmd+Shift+Z)

### User Experience

- **Real-time Feedback** - Pulsating glow effect on running nodes
- **Connected State UI** - Inputs automatically disable when connected via edges
- **Run History Panel** - Track execution history with node-level details
- **Minimap Navigation** - Easy overview and navigation of large workflows

## Tech Stack

| Category        | Technology               |
| --------------- | ------------------------ |
| Framework       | Next.js 14 (App Router)  |
| Language        | TypeScript               |
| Styling         | Tailwind CSS + ShadCN UI |
| Canvas          | React Flow               |
| State           | Zustand                  |
| Auth            | Clerk                    |
| Database        | Prisma + Neon PostgreSQL |
| AI/LLM          | Google Gemini API        |
| File Upload     | Transloadit              |
| Background Jobs | Trigger.dev              |
| Validation      | Zod                      |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (I used Neon)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/nextflow.git
   cd nextflow
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file with the following:

   ```env
   # Database
   DATABASE_URL="your-postgresql-connection-string"

   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
   CLERK_SECRET_KEY=your-clerk-secret-key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

   # Google Gemini
   GOOGLE_AI_API_KEY=your-gemini-api-key

   # Transloadit
   TRANSLOADIT_AUTH_KEY=your-transloadit-key
   TRANSLOADIT_AUTH_SECRET=your-transloadit-secret
   NEXT_PUBLIC_TRANSLOADIT_KEY=your-transloadit-key

   # Trigger.dev
   TRIGGER_SECRET_KEY=your-trigger-dev-key
   ```

4. **Set up the database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **Start Trigger.dev worker** (in a separate terminal)

   ```bash
   npx trigger.dev@latest dev --skip-update-check
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## Node Types

### Text Node

Simple text input that outputs a string value.

### Upload Image Node

Upload images via Transloadit with automatic optimization. Supports JPG, PNG, WebP.

### Upload Video Node

Upload videos via Transloadit. Supports MP4, MOV, WebM.

### Run Any LLM Node

Execute prompts using Google Gemini API. Supports:

- System prompts
- User messages
- Image inputs (vision)

### Crop Image Node

Crop images using percentage-based coordinates (x%, y%, width%, height%).

### Extract Frame Node

Extract a single frame from a video at a specified timestamp.

## Project Structure

```
nextflow/
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── sign-in/       # Auth pages
│   │   └── page.tsx       # Main app
│   ├── components/
│   │   ├── nodes/         # Node components
│   │   ├── ui/            # ShadCN components
│   │   └── ...
│   ├── lib/
│   │   ├── workflow-runner.ts
│   │   └── validations.ts
│   ├── store/
│   │   └── workflow-store.ts
│   ├── trigger/
│   │   └── tasks/         # Background tasks
│   └── types/
│       └── workflow.ts
├── prisma/
│   └── schema.prisma
└── ...
```

## API Endpoints

| Endpoint              | Method | Description          |
| --------------------- | ------ | -------------------- |
| `/api/workflows`      | GET    | List all workflows   |
| `/api/workflows`      | POST   | Create workflow      |
| `/api/workflows/[id]` | GET    | Get workflow by ID   |
| `/api/workflows/[id]` | PUT    | Update workflow      |
| `/api/workflows/[id]` | DELETE | Delete workflow      |
| `/api/history`        | GET    | Get run history      |
| `/api/history`        | POST   | Create history entry |
| `/api/execute-task`   | POST   | Execute node tasks   |
| `/api/transloadit`    | POST   | Get upload signature |

## Keyboard Shortcuts

| Shortcut               | Action                |
| ---------------------- | --------------------- |
| `Cmd/Ctrl + Z`         | Undo                  |
| `Cmd/Ctrl + Shift + Z` | Redo                  |
| `Cmd/Ctrl + Y`         | Redo (alternative)    |
| `Delete / Backspace`   | Delete selected nodes |

## Known Limitations

- **Extract Frame**: Requires Transloadit paid plan for URL imports. Free tier only supports direct uploads.
- **LLM Rate Limits**: Google Gemini API has rate limits on free tier.

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

The `vercel.json` is already configured for optimal deployment.

## Screenshots

### Main Canvas

The workflow canvas with nodes and connections.

### Sample Workflow

Pre-built workflow demonstrating all 6 node types.

### History Panel

Execution history with expandable node-level details.

## Contributing

This project was built for the Galaxy.ai assignment. Feel free to fork and extend!

## License

MIT License - feel free to use this code for your own projects.

---

Built with ❤️ by Sanjay Singh Rawat
