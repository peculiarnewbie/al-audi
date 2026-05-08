# Project Roadmap

## Overview

English Learning add-on app for an in-person school with teacher-managed workflows, async homework, and real-time live quizzes. Cloudflare-first stack with TanStack Solid Start frontend.

## Current State

### Completed

- Better Auth authentication
- Admin dashboard with user role management
- Quiz authoring and live sessions
- Assignments system
- Reporting dashboard
- Drive backend API (folders, media upload)

### Missing

- Teacher Drive UI for resource management
- Role-based access control enforcement in APIs

---

# Phase 1: Drive UI for Teachers

## Goal

Enable teachers to upload, organize, and manage resources (files, audio, images) through a dedicated Drive interface.

## Tasks

### Backend API Tasks

- [x]   1. Add `GET /api/drive/media` endpoint - list all assets (not just 8)
- [x]   2. Add `DELETE /api/drive/media/[id]` endpoint - delete files
- [x]   3. Add `DELETE /api/drive/folders/[id]` endpoint - delete folders
- [x]   4. Add role check to `POST /api/drive/media` - require teacher role

### Frontend Tasks

- [x]   5. Add "Drive" nav item to dashboard sidebar
- [x]   6. Create Drive page route at `/dashboard/drive`
- [ ]   7. Build `FileUploader` component with drag-and-drop
- [x]   8. Build `FileList` component - display files with icons, name, size, date
- [x]   9. Build `FolderModal` component - create new folder dialog
- [x]   10. Build `DriveBrowser` component - main container with breadcrumb, folder/file view
- [x]   11. Wire up folder navigation (click folder to enter)
- [x]   12. Wire up file upload to POST /api/drive/media
- [x]   13. Wire up folder creation to POST /api/drive/folders
- [x]   14. Wire up file deletion to DELETE /api/drive/media
- [x]   15. Wire up folder deletion to DELETE /api/drive/folders

## Technical Details

### Backend (Existing)

- `POST /api/drive/media` - Upload files to R2 (`drive-media/`)
- `POST /api/drive/folders` - Create folders
- `GET /api/drive/folders` - List folders with permissions

### Schema (Existing)

- `driveAssets` table: id, teacherId, folderId, fileName, r2Key, contentType, fileSize, createdAt
- `driveFolders` table: id, teacherId, name, createdAt, permissions (classIds, studentIds)

### File Structure

```
packages/www/src/
├── routes/dashboard/drive/
│   └── index.tsx       # Drive page
├── components/
│   └── drive/
│       ├── FileUploader.tsx
│       ├── FileList.tsx
│       ├── FolderModal.tsx
│       └── DriveBrowser.tsx
```

---

# Phase 2: Role-Based Access Control

## Goal

Enforce role-based permissions throughout the application.

## Tasks

1. Add role checks to all API endpoints
2. Migrate teachers/students tables to unified users table
3. Add role enum: none, student, teacher, admin
