# BakBak Database Design

This document explains the database schema design and setup procedures for the BakBak application.

## Database Schema

The application uses SQLite with better-sqlite3 as the database engine. The schema includes the following tables:

### 1. Users
- Uses the `user` table from better-auth
- Extended with a `user_profile` table for application-specific user data

### 2. Recordings
- Stores audio recordings metadata
- Links to S3 storage for the actual audio files
- Tracks recording status, language, and source

### 3. Transcriptions
- Stores text transcriptions of recordings
- Includes romanization for non-Latin script languages
- Supports segmented transcriptions with timestamps

### 4. Translations
- Translates transcriptions to different languages
- Links to the source transcription
- Preserves segment timing for alignment

### 5. Notes
- User notes attached to recordings
- Supports timestamps for specific points in recordings

### 6. Vocabulary Items
- Words and meanings extracted from recordings
- Linked to notes for organization

### 7. Recording Sharing
- Controls access permissions for shared recordings
- Tracks ownership and permissions

## Database Setup

### Manual Setup

The database setup is managed through a standalone script that can be run manually:

```bash
# Set up database (creates schema only)
node scripts/setup-db.js

# Or with npm script
npm run db:setup

# Set up database and seed with test data
node scripts/setup-db.js --seed

# Or with npm script
npm run db:setup:seed
```

The database file will be created at `./data/sqlite.db`.

### Script Details

The setup script:

1. Creates all necessary tables if they don't exist
2. Sets up proper indexes for performance
3. Can seed test data including:
   - A test user (email: test@example.com, password: password123)
   - Sample recordings in different languages
   - Transcriptions, translations, notes, and vocabulary items

### With Docker

To run the application with Docker:

```bash
# Start the application with Docker Compose
docker-compose up

# Or in detached mode
docker-compose up -d
```

## Database Models

The application uses TypeScript models to interact with the database. These are available at `src/database/models/`:

- `User.ts`: User profile operations
- `Recording.ts`: Recording management
- `Transcription.ts`: Transcription processing
- `Translation.ts`: Translation management
- `Note.ts`: User notes and vocabulary
- `RecordingSharing.ts`: Access control

## Example Usage

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

## Database Schema Evolution

For future schema changes:

1. Update the schema in the setup script (`scripts/setup-db.js`)
2. Create migration scripts in `scripts/migrations/` (if needed)
3. Test the migration locally
4. Update Docker setup if needed

## Backup and Restore

To backup the database:

```bash
# Copy the SQLite file
cp ./data/sqlite.db ./data/sqlite.db.backup
```

To restore from backup:

```bash
cp ./data/sqlite.db.backup ./data/sqlite.db
```