# LokBook To-Do List

This document outlines the major features and tasks remaining to bring LokBook from its current state to a full launch, based on the existing project plans.

## Core Architecture & Backend

-   **Real User Authentication**: Implement a full authentication system using Supabase Auth with email magic links and Google OAuth.
-   **Offline-First Storage**: Migrate from `localStorage` to IndexedDB (e.g., using Dexie.js) to handle larger data stores and improve reliability.
-   **Frame Storage Optimization**: Convert canvas frames from base64 data URLs to WebP blobs to reduce storage size.
-   **Real-time Multiplayer**: Set up a real-time backend (e.g., PartyKit) for live battles.
-   **CI/CD Pipeline**: Create a GitHub Actions workflow for automated testing and deployment.
-   **Error Reporting**: Integrate Sentry for crash and error reporting with user consent.

## Gameplay & Feature Implementation

-   **Real Social Feed**: Replace the local-only feed with a real-time feed backed by the Supabase database.
-   **Public User Profiles**: Create shareable profile pages at a `/u/:handle` URL.
-   **Post Sharing Links**: Implement public pages for individual posts at `/p/:postId`.
-   **Pinch-to-Zoom**: Add pinch-to-zoom functionality in the Easel using a library like `@use-gesture/react`.
-   **GIF Export**: Add functionality to export animations as GIF files from the Studio.
-   **Advanced Canvas Features**:
    -   Reference layer for tracing.
    -   Custom color palettes.
    -   Additional canvas sizes (Story, Square, etc.).
    -   Stroke smoothing.

## Polish & Quality of Life

-   **UI Density Setting**: Implement the "Compact" UI density setting to reduce padding and margins for a tighter layout.
-   **"Fire" and "Ice" Name Colors**: Add the animations for the new name colors.
-   **Featured Shop Category**: Implement logic to show a rotating selection of featured items in the shop.
-   **Performance Optimization**:
    -   Ensure bot drawing does not block the UI.
    -   Optimize frame playback to maintain 60fps on mobile devices.
    -   Implement memory guards to handle large storage usage.
-   **Accessibility**: Perform a full manual pass to ensure color contrast meets WCAG standards.

---