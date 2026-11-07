# Security Policy

## Supported versions

This repository is under active development. The default branch is the primary development line. No formal long-term support or security patch SLA is currently published.

## Reporting a vulnerability

**Do not open a public issue for an exploitable vulnerability.**

Please use GitHub's **Private vulnerability reporting** feature for this repository when it is enabled. If that option is unavailable, contact the maintainers through the [TriFusion Dynamics contact page](https://trifusiondynamics.vercel.app/contact) and include a subject that clearly identifies a security report.

Please include:

- A concise description and affected component/path.
- Impact and realistic attack scenario.
- Steps to reproduce or a proof of concept that does not access real user data.
- Affected commit, branch or deployment (if known).
- Suggested mitigation, if available.

Do not include live credentials, personal data, customer records or destructive payloads in the report.

## What to expect

The maintainers will acknowledge reports as soon as reasonably practical, validate the issue, assess severity and coordinate a fix or mitigation. There is currently no guaranteed response or remediation SLA. Please allow maintainers time to investigate and release a fix before public disclosure.

## Security expectations for contributors

- Never commit secrets. Rotate any credential accidentally exposed in Git history or logs.
- Use least-privilege credentials and separate development/staging/production environments.
- Validate inputs and authorize every protected operation server-side.
- Derive tenant scope from authenticated identity; never trust client-supplied tenant IDs.
- Avoid leaking tokens, passwords, private data or sensitive AI prompts in logs.
- Keep dependencies and container base images updated.
- Review migrations, backups and access policies before production rollout.

## Scope notes

A security control shown in documentation or configuration is not proof that every runtime path is protected. Verify the actual code, deployment settings, authorization guards and tests. Security reports are welcome for the website, dashboard, API, AI service, CI/CD workflows and infrastructure maintained in this repository.
