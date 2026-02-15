# Scope of Work: edUmeetup

## Project Overview
edUmeetup is a Next.js application designed to connect students with universities worldwide. The goal is to provide a platform where students can browse university programs, create profiles, and connect directly with institutions.

## Reference MVP
The project design and functionality are modeled after the reference MVP:
[https://edumeetup-mvp.vercel.app/](https://edumeetup-mvp.vercel.app/)

## Technical Stack
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS

## Key Features
1.  **Landing Page**:
    -   Showcase the platform's value proposition ("Where Dreams Meet Destinations").
    -   Include "How it Works" section.
    -   Provide clear call-to-action buttons for students and universities.

2.  **Authentication**:
    -   Implement separate login/signup flows for students and universities.

3.  **Student Portal**:
    -   Allow students to register and create profiles.
    -   Enable students to browse verified universities and programs.
    -   Facilitate matching based on student interests and university offerings.

4.  **University Portal**:
    -   Allow universities to register and create profiles.
    -   Enable universities to list their programs and manage applications.
    -   Provide tools to review student interest and initiate contact.

5.  **Browsing & Search**:
    -   Implement a searchable directory of universities.
    -   Include filtering options (e.g., by country, program).

6.  **Public Pages**:
    -   About Us
    -   Contact
    -   Privacy Policy
    -   Terms of Service

## Current Status
The project currently has basic implementations of:
-   Home page (`app/page.tsx`)
-   University browsing page (`app/universities/page.tsx`)
-   Registration placeholders for students and universities.

## Next Steps
-   Implement full authentication logic.
-   Connect the application to a backend or mock data service for dynamic content.
-   Flesh out the student and university dashboards.
-   Ensure responsive design across all pages.
