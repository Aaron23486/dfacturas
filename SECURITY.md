# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's private vulnerability reporting for this repository (**Security → Report a vulnerability**). Do not open a public issue for a security problem.

Include the affected version or commit, the steps to reproduce and the impact you observed. I will acknowledge the report, confirm whether it reproduces and publish a fix and an advisory when it is resolved.

## Supported versions

Only the latest release on `main` receives security fixes.

## Scope

The application code, the SQL migrations and the scripts in this repository. Hosted Supabase or Vercel configuration of a particular deployment is the responsibility of whoever runs it; [docs/deployment.md](docs/deployment.md) lists the settings the application expects.

The controls in place and the known residual risks are described in [docs/security.md](docs/security.md).
