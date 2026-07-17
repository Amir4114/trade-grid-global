# Trade Grid Global — Documentation

B2B Food & FMCG trading platform focused on **trust**, **verification**, and **procurement**.

| | |
|--|--|
| **Current version** | `0.4.0` / target tag `v0.4.0-purchase-orders` |
| **Latest milestone** | RFQ → Quotation → Award → Purchase Order (apply `017`) |
| **Root README** | [../README.md](../README.md) |
| **Contributing** | [../CONTRIBUTING.md](../CONTRIBUTING.md) |

---

## Documentation map

### Core

| Document | Path |
|----------|------|
| Changelog | [CHANGELOG.md](./CHANGELOG.md) |
| Release notes | [RELEASE_NOTES.md](./RELEASE_NOTES.md) |

### Architecture

| Document | Path |
|----------|------|
| Architecture status (master) | [architecture/ARCHITECTURE_STATUS_v0.3.0.md](./architecture/ARCHITECTURE_STATUS_v0.3.0.md) |
| System architecture | [architecture/SYSTEM_ARCHITECTURE.md](./architecture/SYSTEM_ARCHITECTURE.md) |
| Database schema | [architecture/DATABASE_SCHEMA.md](./architecture/DATABASE_SCHEMA.md) |
| ER diagram | [architecture/ER_DIAGRAM.md](./architecture/ER_DIAGRAM.md) |
| Data flow | [architecture/DATA_FLOW.md](./architecture/DATA_FLOW.md) |
| Security model | [architecture/SECURITY_MODEL.md](./architecture/SECURITY_MODEL.md) |
| API / RPC reference | [architecture/API_REFERENCE.md](./architecture/API_REFERENCE.md) |
| Decision log | [architecture/DECISION_LOG.md](./architecture/DECISION_LOG.md) |
| Architecture decisions (locked ADRs) | [architecture/ARCHITECTURE_DECISIONS.md](./architecture/ARCHITECTURE_DECISIONS.md) |

### Planning

| Document | Path |
|----------|------|
| Project context | [planning/PROJECT_CONTEXT.md](./planning/PROJECT_CONTEXT.md) |
| Current status | [planning/CURRENT_STATUS.md](./planning/CURRENT_STATUS.md) |
| Roadmap | [planning/ROADMAP.md](./planning/ROADMAP.md) |
| Milestones | [planning/MILESTONES.md](./planning/MILESTONES.md) |
| Backlog | [planning/BACKLOG.md](./planning/BACKLOG.md) |
| Future features | [planning/FUTURE_FEATURES.md](./planning/FUTURE_FEATURES.md) |
| Module 3.1 PO design | [planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md](./planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md) |

### Deployment

| Document | Path |
|----------|------|
| Deployment | [deployment/DEPLOYMENT.md](./deployment/DEPLOYMENT.md) |
| Environment | [deployment/ENVIRONMENT.md](./deployment/ENVIRONMENT.md) |
| Backup & recovery | [deployment/BACKUP_AND_RECOVERY.md](./deployment/BACKUP_AND_RECOVERY.md) |
| Monitoring | [deployment/MONITORING.md](./deployment/MONITORING.md) |
| Release checklist | [deployment/RELEASE_CHECKLIST.md](./deployment/RELEASE_CHECKLIST.md) |
| Rollback procedure | [deployment/ROLLBACK_PROCEDURE.md](./deployment/ROLLBACK_PROCEDURE.md) |

### Development

| Document | Path |
|----------|------|
| Contributor onboarding | [development/CONTRIBUTOR_ONBOARDING.md](./development/CONTRIBUTOR_ONBOARDING.md) |
| Coding standards | [development/CODING_STANDARDS.md](./development/CODING_STANDARDS.md) |
| Testing | [development/TESTING.md](./development/TESTING.md) |
| Git workflow | [development/GIT_WORKFLOW.md](./development/GIT_WORKFLOW.md) |
| Branching strategy | [development/BRANCHING_STRATEGY.md](./development/BRANCHING_STRATEGY.md) |
| Release process | [development/RELEASE_PROCESS.md](./development/RELEASE_PROCESS.md) |
| Migration guidelines | [development/MIGRATION_GUIDELINES.md](./development/MIGRATION_GUIDELINES.md) |
| Code review checklist | [development/CODE_REVIEW_CHECKLIST.md](./development/CODE_REVIEW_CHECKLIST.md) |
| API design guidelines | [development/API_DESIGN_GUIDELINES.md](./development/API_DESIGN_GUIDELINES.md) |
| UI/UX guidelines | [development/UI_UX_GUIDELINES.md](./development/UI_UX_GUIDELINES.md) |
| Component guidelines | [development/COMPONENT_GUIDELINES.md](./development/COMPONENT_GUIDELINES.md) |
| State management | [development/STATE_MANAGEMENT.md](./development/STATE_MANAGEMENT.md) |
| Error handling | [development/ERROR_HANDLING.md](./development/ERROR_HANDLING.md) |
| Logging guidelines | [development/LOGGING_GUIDELINES.md](./development/LOGGING_GUIDELINES.md) |
| Performance guidelines | [development/PERFORMANCE_GUIDELINES.md](./development/PERFORMANCE_GUIDELINES.md) |
| Accessibility | [development/ACCESSIBILITY.md](./development/ACCESSIBILITY.md) |
| Security checklist | [development/SECURITY_CHECKLIST.md](./development/SECURITY_CHECKLIST.md) |
| Dependency policy | [development/DEPENDENCY_POLICY.md](./development/DEPENDENCY_POLICY.md) |
| Versioning policy | [development/VERSIONING_POLICY.md](./development/VERSIONING_POLICY.md) |

### Operations

| Document | Path |
|----------|------|
| Incident response | [operations/INCIDENT_RESPONSE.md](./operations/INCIDENT_RESPONSE.md) |
| Disaster recovery | [operations/DISASTER_RECOVERY.md](./operations/DISASTER_RECOVERY.md) |
| Maintenance | [operations/MAINTENANCE.md](./operations/MAINTENANCE.md) |
| Observability | [operations/OBSERVABILITY.md](./operations/OBSERVABILITY.md) |
| Support runbook | [operations/SUPPORT_RUNBOOK.md](./operations/SUPPORT_RUNBOOK.md) |

### Product

| Document | Path |
|----------|------|
| User roles | [product/USER_ROLES.md](./product/USER_ROLES.md) |
| Business rules | [product/BUSINESS_RULES.md](./product/BUSINESS_RULES.md) |
| Procurement workflow | [product/PROCUREMENT_WORKFLOW.md](./product/PROCUREMENT_WORKFLOW.md) |
| Order lifecycle | [product/ORDER_LIFECYCLE.md](./product/ORDER_LIFECYCLE.md) |
| Payment workflow | [product/PAYMENT_WORKFLOW.md](./product/PAYMENT_WORKFLOW.md) |
| Logistics workflow | [product/LOGISTICS_WORKFLOW.md](./product/LOGISTICS_WORKFLOW.md) |
| AI roadmap | [product/AI_ROADMAP.md](./product/AI_ROADMAP.md) |
| Glossary | [product/GLOSSARY.md](./product/GLOSSARY.md) |

---

## Platform overview (summary)

| Capability | Status |
|------------|--------|
| Auth, verification, products, notifications | Implemented |
| RFQ → quotation → award | Implemented |
| Orders / payments / logistics / production AI | **Not implemented.** |

Detail: [planning/CURRENT_STATUS.md](./planning/CURRENT_STATUS.md) · [architecture/ARCHITECTURE_STATUS_v0.3.0.md](./architecture/ARCHITECTURE_STATUS_v0.3.0.md)

---

## Quick start

See [../README.md](../README.md) and [deployment/DEPLOYMENT.md](./deployment/DEPLOYMENT.md).

New engineers: [development/CONTRIBUTOR_ONBOARDING.md](./development/CONTRIBUTOR_ONBOARDING.md).
