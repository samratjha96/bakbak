# BakBak - Audio Recording & Transcription App

BakBak is an audio recording and transcription application built with React and TanStack Router. It allows users to record, transcribe, translate, and study language audio recordings.

## Features

- Audio recording and playback
- Automatic transcription of recordings
- Translation to different languages
- Notes and vocabulary tracking
- Recording sharing and collaboration

## Tech Stack

- **Frontend**: React 19, TanStack Router, TanStack Query
- **Backend**: TanStack Server, AWS Services
- **Database**: SQLite with better-sqlite3
- **Storage**: AWS S3
- **Authentication**: Better Auth
- **Transcription/Translation**: AWS Transcribe/Translate

## Getting Started

### Requirements

- **Node.js 16+** (for crypto.randomUUID support)
- **Modern browser** with crypto.randomUUID support
- **AWS S3 bucket** with proper credentials configured

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/bakbak.git
cd bakbak
```

2. Install dependencies
```bash
pnpm install
```

3. Create a `.env` file based on `env.example`
```bash
cp env.example .env
# Edit .env with your AWS credentials
```

4. Set up the database manually
```bash
# Set up schema only
node scripts/setup-db.js

# Or with test data
node scripts/setup-db.js --seed

# Or use npm scripts
npm run db:setup
npm run db:setup:seed
```

5. Start the development server
```bash
npm run dev
```

### Docker Setup

Alternatively, you can use Docker:

```bash
# Start with Docker Compose
docker-compose up
```

## Database

See [DATABASE.md](./DATABASE.md) for detailed information about the database schema and models.

## Environment Configuration

### Required Environment Variables

```bash
# REQUIRED: S3 Storage Configuration
AWS_S3_BUCKET=your-recordings-bucket

# REQUIRED: AWS Configuration  
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# REQUIRED: Authentication
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Storage Organization

All recordings are organized with this exact structure:

```
your-bucket/
└── recordings/
    ├── user-123/
    │   ├── 2024-01-15/
    │   │   ├── uuid-1.webm
    │   │   ├── uuid-1-transcription.json
    │   │   └── uuid-1-translation-es.json
    │   └── 2024-01-16/
    │       └── uuid-2.webm
    └── user-456/
        └── 2024-01-15/
            └── uuid-3.webm
```

**Benefits:**
- **Complete user isolation**: No cross-user access possible
- **Date-based organization**: Easy cleanup and management by date
- **UUID identification**: Globally unique identifiers prevent conflicts
- **Related file grouping**: All recording derivatives stored together

## API Routes

The application uses TanStack Router for file-based routing. API routes are available at:

- `/api/recordings` - Recording management
- `/api/recordings/:id/transcribe` - Transcription endpoints
- `/api/recordings/:id/translate` - Translation endpoints

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

## Docker Development

```bash
# Start development environment
docker-compose up

# Rebuild containers
docker-compose build

# Stop containers
docker-compose down
```

## Usage Examples

### Audio Upload Implementation

The audio upload follows TanStack Start best practices with a server function co-located with the route:

```typescript
// In src/routes/recordings/new.tsx
import { createServerFn } from "@tanstack/react-start";

const uploadAudioRecording = createServerFn({ method: "POST" })
  .validator((data) => {
    // Validate FormData with audioFile, userId, fileExtension
    if (!(data instanceof FormData)) {
      throw new Error("Invalid form data");
    }
    // ... validation logic
  })
  .handler(async ({ data: { audioFile, userId, fileExtension } }) => {
    // Generate structured S3 path with UUID
    // Upload directly to S3 using presigned URLs
    // Return URL and metadata
  });

// Usage in component:
const formData = new FormData();
formData.append('audioFile', audioFile);
formData.append('userId', session.user.id);
formData.append('fileExtension', 'webm');

const result = await uploadAudioRecording({ data: formData });
```

### Working with Storage Paths

```typescript
import { RecordingStoragePaths } from "~/services/storage/RecordingStoragePaths";

// Generate structured paths (no fallbacks)
const audioPath = RecordingStoragePaths.getAudioPath("user123");
const transcriptionPath = RecordingStoragePaths.getTranscriptionPath("user123", "recording-uuid");
const translationPath = RecordingStoragePaths.getTranslationPath("user123", "recording-uuid", "es");

// List all recordings for a user on a specific date
const userDatePath = RecordingStoragePaths.getUserDatePath("user123", "2024-01-15");

// Extract information from paths (returns null if invalid format)
const userId = RecordingStoragePaths.extractUserId(audioPath);
const recordingUUID = RecordingStoragePaths.extractRecordingUUID(audioPath);
const date = RecordingStoragePaths.extractDate(audioPath);
```

### Database Access Examples

```typescript
import { RecordingModel } from './database/models';

// Find all recordings for a user
const recordings = RecordingModel.findByUserId('user-123');

// Get a specific recording
const recording = RecordingModel.findById('recording-456');

// Create a new recording
const newRecording = RecordingModel.create({
  userId: 'user-123',
  title: 'Practice Session',
  description: 'Japanese conversation practice',
  filePath: 's3://recordings/user-123/recording.webm',
  language: 'Japanese',
  duration: 120,
  sourceType: RecordingSourceType.SELF_RECORDED
});
```

## License

[MIT](LICENSE)
