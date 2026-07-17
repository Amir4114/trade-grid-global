# Versioning Policy

## Purpose

Keep product tags, npm version, and docs aligned.

## Scope

Version strings only.

## Table of contents

1. [Current Status](#current-status)
2. [Version kinds](#version-kinds)
3. [Rules](#rules)
4. [References](#references)
5. [Future notes](#future-notes)

## Current Status

| Kind | Current value |
|------|---------------|
| npm `package.json` | `0.3.0` |
| Git product tag | `v0.3.0-procurement-complete` |
| Architecture doc | `ARCHITECTURE_STATUS_v0.3.0` |

## Version kinds

| Kind | Example | Meaning |
|------|---------|---------|
| Semver package | `0.3.0` | Installable package metadata |
| Milestone tag | `v0.3.0-procurement-complete` | Named product capability |
| Doc edition | `v0.3.0` in filenames/titles | Doc generation aligned to release |

## Rules

1. On release: bump semver when behavior ships; add changelog section
2. Milestone tags may include a capability suffix
3. Do not leave docs claiming `0.0.1` after bump
4. Breaking RPC/status behavior must appear under Changed/Security in changelog

## References

- [../CHANGELOG.md](../CHANGELOG.md)
- [../RELEASE_NOTES.md](../RELEASE_NOTES.md)
- [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)

## Future notes

Publish a public semver API package only if a separate SDK is created. **Not implemented.**

---

**Last Updated:** 2026-07-18
