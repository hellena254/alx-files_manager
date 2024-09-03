# Files Manager

## Overview

The Files Manager API provides functionality for managing user files and folders with support for authentication, file upload, and retrieval. It includes endpoints for managing file visibility and accessing file content.

## Prerequisites

Before working on this project, you should be familiar with the following concepts and technologies:

1. **Node.js and Express**: Understanding how to build and structure web applications using Node.js and the Express framework.
2. **MongoDB**: Knowledge of NoSQL databases, particularly MongoDB, for storing and querying file and user data.
3. **Redis**: Basic understanding of Redis for session management and caching.
4. **Authentication**: Familiarity with token-based authentication methods, including generating, validating, and using authentication tokens.
5. **File Handling**: Experience with file system operations in Node.js, including reading, writing, and managing files on the local filesystem.
6. **HTTP Methods and Status Codes**: Understanding of HTTP methods (GET, POST, PUT) and status codes (200, 400, 401, 404).
7. **Error Handling**: Techniques for managing errors and providing appropriate responses in a web API.
8. **Base64 Encoding**: Knowledge of encoding and decoding Base64 data for file storage and retrieval.

## Endpoints

### Authentication

- **GET /connect**: Obtain a token for authentication.
- **GET /disconnect**: Invalidate the current token.

### User Management

- **POST /users**: Create a new user.
- **GET /users/me**: Retrieve the authenticated user's profile.

### File Management

- **POST /files**: Upload a new file or folder.
- **GET /files**: List user files with optional pagination and parentId filter.
- **GET /files/:id**: Retrieve a specific file's metadata.
- **PUT /files/:id/publish**: Set a file to be publicly accessible.
- **PUT /files/:id/unpublish**: Set a file to be private.
- **GET /files/:id/data**: Retrieve the content of a file.

## Authentication

- Authentication is managed using tokens. Include the token in the `X-Token` header for protected endpoints.

## Error Handling

- **401 Unauthorized**: Missing or invalid token.
- **404 Not Found**: Resource not found or access denied.
- **400 Bad Request**: Invalid request data.

## Development

- **Tech Stack**: Node.js, Express, MongoDB, Redis.
- **File Storage**: Local filesystem with configurable path.

## Setup

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Set environment variables as needed (e.g., `FOLDER_PATH`).
4. Start the server with `npm start`.

