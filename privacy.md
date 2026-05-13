# Privacy Policy — xoop

**Last updated:** 2026-05-14

## Overview

xoop is a personal, single-user, self-hosted application that retrieves the operator's own Whoop fitness data via the official Whoop Developer API for personal analysis and visualization.

## Data collected

xoop accesses Whoop data belonging exclusively to the authenticated user (the operator of this application), including:

- Profile (name, email)
- Body measurements (height, weight, max heart rate)
- Cycles (daily strain, energy, average and max heart rate)
- Recovery (recovery score, HRV, resting heart rate, SpO₂, skin temperature)
- Sleep (sessions, stage durations, performance, efficiency, consistency, disturbances, respiratory rate)
- Workouts (sport, duration, strain, heart rate zones, energy, distance)

If the operator chooses to import their Whoop data export, the application can additionally process:

- Journal entries (behavior questions and yes/no answers logged in the Whoop app)
- Other CSVs from the export, stored verbatim for the operator's inspection

## How data is used

Data is fetched from the Whoop API and stored in a private Supabase database instance owned and controlled by the operator. The data is used solely for the operator's personal review and analysis. It is never shared, sold, or transmitted to third parties.

## Data storage

All data — including OAuth access and refresh tokens — is stored in a private Supabase project that the operator provisions and controls. The application has no centralized backend and no shared storage.

## Third parties

No data is shared with any third party. xoop communicates only with the official Whoop API endpoints (`api.prod.whoop.com`) and with the operator's own Supabase project. There is no analytics, telemetry, error reporting, or advertising.

## User rights

This application is operated by a single individual for their own personal use. The operator has full control over the stored data and may delete or revoke it at any time, including:

- Deleting their Supabase database
- Revoking the OAuth grant in the Whoop developer portal or app
- Removing the local installation

## Contact

For questions about this application or to report an issue, contact the repository owner via the GitHub project page: https://github.com/MaximilianSajonz/xoop
