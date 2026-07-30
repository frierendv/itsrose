/**
 * @packageDocumentation
 * @module @itsrose/character-ai
 * @category Features
 *
 * Feature package for integrating with the Character.ai Neo service.
 * Provides real-time chat streaming over WebSockets, character searching, and user profile management.
 */
// #if !CAI_API_ENABLE
export * from "./character-ai";
// #endif
export * from "./client";
export * from "./chat";
export * from "./zod-schema";
