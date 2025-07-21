# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is ANISA, a WhatsApp AI chatbot built on AWS using SST v3. It's a monorepo with three packages that work together to handle WhatsApp webhook events, process AI responses using OpenAI, and manage data through Supabase.

## Development Commands

### Core Commands
- `npm install` - Install dependencies across all packages
- `npx sst deploy` - Deploy the application to AWS
- `npx sst dev` - Start development mode with live Lambda functions
- `npx sst shell` - Access the SST shell for running scripts

### Testing
- `npm test` (in packages/core) - Run Vitest tests for the core package via `sst shell vitest`

### Scripts
- `npm run shell src/example.ts` (in packages/scripts) - Run scripts using `sst shell tsx`

## Architecture

### Message Processing Flow
1. **WhatsApp Webhook** (`webhook.ts`) receives messages and validates them
2. **Media Processing**: Images are downloaded, converted to base64, and uploaded to Supabase
3. **SQS Queues**: Messages are queued for async processing
4. **Response Handler** (`response.ts`) generates AI responses and handles tool calls
5. **Media Handler** (`media.ts`) generates images using OpenAI DALL-E
6. **Reply Service** sends responses back to WhatsApp via Graph API

### Core Data Types
- **AnisaPayload**: Central message format supporting text/image/audio from WhatsApp/Telegram
- **BatchItemFailure**: SQS batch processing error handling
- Uses strict TypeScript with module exports for tree-shaking

### Lambda Function Responsibilities
- **webhook.ts**: Webhook verification (GET) and message intake (POST)
- **response.ts**: Text message AI processing, supports OpenAI tool calls that trigger image generation
- **media.ts**: DALL-E image generation from text prompts with optional reference images
- All handlers use Promise.allSettled for concurrent batch processing with partial failure support

### Infrastructure Components
- **API Gateway V2**: Handles WhatsApp webhook endpoints (GET/POST /)
- **SQS Queues**: 
  - MessageQueue (FIFO) - Text messages → response handler
  - MediaQueue (FIFO) - Image generation requests, 10-minute timeout
- **Lambda Functions**: Event-driven with shared environment variables via SST Secrets

## Environment Configuration

The application uses SST Secrets for environment variables including:
- OpenAI API credentials
- WhatsApp Graph API token
- Supabase configuration
- Stripe payment processing
- YooKassa payment processing
- Various API tokens and keys

## Development Notes

- Uses npm workspaces for monorepo management
- TypeScript with strict mode enabled across all packages
- The core package exports modules that can be imported as `@ANISA/core/moduleName`
- Functions package depends on core package for shared logic
- All packages use ES modules (`"type": "module"`)