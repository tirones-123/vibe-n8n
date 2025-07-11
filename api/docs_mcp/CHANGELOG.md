# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.7.10] - 2025-07-07

### Added
- Enhanced authentication logging for better debugging of client authentication issues
- Specific error reasons for authentication failures: `no_auth_header`, `invalid_auth_format`, `invalid_token`
- AUTH_TOKEN_FILE support in single-session HTTP server for consistency
- Empty token validation to prevent security issues
- Whitespace trimming for authentication tokens

### Fixed
- Issue #22: Improved authentication failure diagnostics for mcp-remote client debugging
- Issue #16: Fixed AUTH_TOKEN_FILE validation for HTTP mode in Docker production stacks - Docker entrypoint now properly validates and supports AUTH_TOKEN_FILE environment variable
- Security: Removed token length from logs to prevent information disclosure

### Security
- Authentication tokens are now trimmed to handle whitespace edge cases
- Empty tokens are explicitly rejected with clear error messages
- Removed sensitive information (token lengths) from authentication logs

## [2.7.8] - 2025-07-06

### Added
- npx support for zero-installation usage - users can now run `npx n8n-mcp` without installing
- npm package distribution with runtime-only dependencies (8 deps vs 50+ dev deps)
- Dedicated publish script for npm releases with OTP support
- Database path resolution supporting npx, global, and local installations

### Fixed
- Issue #15: Added npx execution support as requested
- Removed development dependencies from npm package (reduced from 1GB+ to ~50MB)
- Node.js version conflicts by excluding n8n dependencies from runtime package

### Changed
- npm package now uses package.runtime.json for publishing (no n8n dependencies)
- Enhanced .gitignore to exclude npm publishing artifacts
- README now highlights npx as the primary installation method

## [2.7.5] - 2025-07-06

### Added
- AUTH_TOKEN_FILE support for reading authentication tokens from files (Docker secrets compatible) - partial implementation
- Known Issues section in README documenting Claude Desktop container duplication bug
- Enhanced authentication documentation in Docker README

### Fixed
- Issue #16: AUTH_TOKEN_FILE was documented but not implemented (partially fixed - see v2.7.10 for complete fix)
- HTTP server now properly supports both AUTH_TOKEN and AUTH_TOKEN_FILE environment variables

### Changed
- Authentication logic now checks AUTH_TOKEN first, then falls back to AUTH_TOKEN_FILE
- Updated Docker documentation to clarify authentication options

## [2.7.4] - 2025-07-03

### Changed
- Renamed `start_here_workflow_guide` tool to `tools_documentation` for better clarity
- Converted tool output from JSON to LLM-friendly plain text format
- Made documentation concise by default with "essentials" depth

### Added
- `depth` parameter to control documentation detail level ("essentials" or "full")
- Per-tool documentation - get help for any specific MCP tool
- Two-tier documentation system:
  - Essentials: Brief description, key parameters, example, performance, tips
  - Full: Complete documentation with all details, examples, best practices
- Quick reference mode when called without parameters
- Documentation for 8 commonly used tools
- Test script for tools documentation (`test:tools-documentation`)

### Removed
- Removed duplicate `tools_documentation` tool definition
- Removed unused `getWorkflowGuide` method (380+ lines)
- Removed old `handlers-documentation.ts` file

## [2.7.3] - 2025-07-02

### Added
- MCP Tools Documentation system (initial implementation)
- `tools_documentation` tool for comprehensive MCP tool documentation
- Documentation includes parameters, examples, best practices, and pitfalls
- Search tools by keyword functionality
- Browse tools by category
- Quick reference guide with workflow patterns

### Fixed
- Cleaned up redundant tool definitions

## [2.7.2] - 2025-07-01

### Fixed
- HTTP deployment documentation improvements
- Docker configuration updates with n8n API options

### Changed
- Updated version handling in multiple configuration files

## [2.7.1] - 2025-06-30

### Fixed
- Workflow diff engine edge cases
- Transactional update processing improvements

### Added
- Additional test coverage for diff operations
- Debug scripts for update operations

## [2.7.0] - 2025-06-29

### Added
- New `n8n_update_partial_workflow` tool for efficient diff-based workflow editing with transactional updates
- WorkflowDiffEngine for applying targeted edits without sending full workflow JSON (80-90% token savings)
- 13 diff operations: addNode, removeNode, updateNode, moveNode, enableNode, disableNode, addConnection, removeConnection, updateConnection, updateSettings, updateName, addTag, removeTag
- Smart node references supporting both node ID and name
- Transaction safety with validation before applying changes
- Validation-only mode for testing diff operations
- Comprehensive test coverage for all diff operations
- Example guide in `docs/workflow-diff-examples.md`
- Two-pass processing allowing operations in any order
- Operation limit of 5 operations per request for reliability
- `n8n_diagnostic` tool to troubleshoot management tools visibility issues
- Version utility (`src/utils/version.ts`) for centralized version management
- Script to sync package.runtime.json version

### Changed
- Renamed `n8n_update_workflow` to `n8n_update_full_workflow` to clarify it replaces entire workflow
- Renamed core MCP files for clarity:
  - `tools-update.ts` → `tools.ts`
  - `server-update.ts` → `server.ts`
  - `http-server-fixed.ts` → `http-server.ts`
- Updated imports across 21+ files to use new file names

### Fixed
- Version mismatch issue where version was hardcoded instead of reading from package.json (GitHub issue #5)
- MCP validation error by simplifying schema to allow additional properties
- n8n API validation by removing all read-only fields in cleanWorkflowForUpdate
- Claude Desktop compatibility by adding additionalProperties: true
- Removed DEBUG console.log statements from MCP server

### Removed
- Legacy HTTP server implementation (`src/http-server.ts`)
- Unused legacy API client (`src/utils/n8n-client.ts`)
- Unnecessary file name suffixes (-update, -fixed)

## [2.6.3] - 2025-06-26

### Added
- `n8n_validate_workflow` tool to validate workflows directly from n8n instance by ID
- Fetches workflow from n8n API and runs comprehensive validation
- Supports all validation profiles and options
- Part of complete lifecycle: discover → build → validate → deploy → execute

## [2.6.2] - 2025-06-26

### Added
- Node type validation to verify node types exist in n8n
- Smart suggestions for common mistakes (e.g., `webhook` → `n8n-nodes-base.webhook`)
- Minimum viable workflow validation preventing single-node workflows (except webhooks)
- Empty connection detection for multi-node workflows
- Helper functions: `getWorkflowStructureExample()` and `getWorkflowFixSuggestions()`

### Fixed
- nodes-base prefix detection now catches errors before database lookup
- Enhanced error messages with clear guidance on proper workflow structure

## [2.6.1] - 2025-06-26

### Added
- typeVersion validation in workflow validator
- Enforces typeVersion on all versioned nodes
- Warns on outdated node versions
- Prevents invalid version numbers

### Fixed
- Missing typeVersion errors with correct version suggestions
- Invalid version detection exceeding maximum supported

## [2.6.0] - 2025-06-26

### Added
- 14 n8n management tools for complete workflow lifecycle management:
  - `n8n_create_workflow` - Create workflows programmatically
  - `n8n_update_workflow` - Update existing workflows
  - `n8n_trigger_webhook_workflow` - Execute workflows via webhooks
  - `n8n_list_executions` - Monitor workflow executions
  - `n8n_health_check` - Check n8n instance connectivity
  - And 9 more workflow and execution management tools
- Integration with n8n-manager-for-ai-agents functionality
- Conditional tool registration based on N8N_API_URL and N8N_API_KEY configuration
- Smart error handling for API limitations

## [2.5.1] - 2025-06-24

### Added
- `get_node_as_tool_info` tool for specific information about using ANY node as an AI tool
- Enhanced AI tool support with usage guidance
- Improved start_here_workflow_guide with Claude Project setup

### Changed
- Enhanced AI tool detection and documentation
- Updated documentation to match current state

## [2.5.0] - 2025-06-24

### Added
- Comprehensive workflow validation system:
  - `validate_workflow` - Validate entire workflows before deployment
  - `validate_workflow_connections` - Check workflow structure and connections
  - `validate_workflow_expressions` - Validate all n8n expressions
- Expression validator for n8n syntax validation
- AI tool connection validation
- Phase 2 validation improvements

## [2.4.2] - 2025-06-24

### Added
- Enhanced operation-aware validation system
- `validate_node_operation` - Verify node configuration with operation awareness
- `validate_node_minimal` - Quick validation for required fields only
- Node-specific validation logic
- Validation profiles support

### Fixed
- Validation improvements based on AI agent feedback

## [2.4.1] - 2025-06-20

### Added
- n8n workflow templates integration:
  - `list_node_templates` - Find workflow templates using specific nodes
  - `get_template` - Get complete workflow JSON for import
  - `search_templates` - Search templates by keywords
  - `get_templates_for_task` - Get curated templates for common tasks
- Template fetching from n8n.io API
- Robust template fetching with retries
- Expanded template window from 6 months to 1 year

### Fixed
- Made templates available in Docker by removing axios from runtime
- Template service made optional in Docker environment
- Non-deterministic CHECK constraint removed from templates table

## [2.4.0] - 2025-06-18

### Added
- AI-optimized tools with 95% size reduction:
  - `get_node_essentials` - Returns only essential properties (10-20) with examples
  - `search_node_properties` - Find specific properties without downloading everything
  - `get_node_for_task` - Get pre-configured node settings for common tasks
  - `list_tasks` - List all available task templates
  - `get_property_dependencies` - Analyze property dependencies and visibility conditions
- Property filter service with curated essential properties
- Example generator for common use cases
- Task templates with pre-configured settings
- Docker build optimization (82% smaller images, 10x faster builds)

### Changed
- Switched to MIT license for wider adoption
- Optimized Docker builds to exclude n8n dependencies at runtime
- Improved tool descriptions and added workflow guide tool

### Fixed
- Docker build failures in GitHub Actions
- Claude Desktop stdio communication issues
- Version array handling in node parser

### Removed
- Legacy MCP implementation files
- n8n dependencies from Docker runtime image

## [2.3.3] - 2025-06-16

### Added
- Smart dependency update system for n8n packages
- GitHub Actions workflow for automated n8n updates
- Alternative Renovate configuration

### Fixed
- n8n package interdependent version requirements
- Node type references in validation script

## [2.3.2] - 2025-06-14

### Added
- Single-session HTTP server architecture
- Direct JSON-RPC implementation for HTTP mode
- Console output isolation for clean JSON-RPC responses

### Fixed
- "stream is not readable" error in HTTP server
- "Server not initialized" error with StreamableHTTPServerTransport
- MCP HTTP server stream errors

## [2.3.1] - 2025-06-13

### Added
- HTTP server mode for remote deployment with token authentication
- MCP-compatible HTTP endpoints
- Security features: CORS, rate limiting, request size limits
- Comprehensive HTTP testing scripts

## [2.3.0] - 2025-06-12

### Added
- Universal Node.js compatibility with automatic database adapter fallback
- Database adapter pattern with BetterSQLiteAdapter and SQLJSAdapter
- Automatic adapter selection based on environment
- sql.js persistence layer with debounced saves

### Changed
- Database operations now use unified adapter interface
- Transparent adapter switching for different Node.js versions

## [2.2.0] - 2025-06-12

### Added
- Enhanced node parser with versioned node support
- Dedicated property extractor for complex node structures
- Full support for @n8n/n8n-nodes-langchain package
- AI tool detection (35 tools with usableAsTool property)

### Changed
- Major refactor based on IMPLEMENTATION_PLAN.md v2.2
- Improved property/operation extraction (452/458 nodes have properties)
- Enhanced documentation mapping

### Fixed
- VersionedNodeType handling
- Documentation mapping issues
- Property extraction for 98.7% of nodes

## [2.1.0] - 2025-06-09

### Added
- Node extraction scripts for n8n modules
- Docker setup for n8n module processing
- Enhanced documentation fetcher
- Node source extractor utility

## [2.0.0] - 2025-06-08

### Added
- Complete overhaul to enhanced documentation-only MCP server
- SQLite database with FTS5 for fast searching
- Comprehensive MCP tools for querying n8n nodes
- Node documentation service as core component

### Changed
- Architecture redesign focusing on documentation serving
- Removed workflow execution capabilities
- Simplified to documentation and knowledge serving

## [1.0.0] - 2025-06-08

### Added
- Initial release
- Basic n8n and MCP integration
- Core workflow automation features

[2.7.10]: https://github.com/czlonkowski/n8n-mcp/compare/v2.7.8...v2.7.10
[2.7.8]: https://github.com/czlonkowski/n8n-mcp/compare/v2.7.5...v2.7.8
[2.7.5]: https://github.com/czlonkowski/n8n-mcp/compare/v2.7.4...v2.7.5
[2.7.4]: https://github.com/czlonkowski/n8n-mcp/compare/v2.7.3...v2.7.4
[2.7.3]: https://github.com/czlonkowski/n8n-mcp/compare/v2.7.2...v2.7.3
[2.7.2]: https://github.com/czlonkowski/n8n-mcp/compare/v2.7.1...v2.7.2
[2.7.1]: https://github.com/czlonkowski/n8n-mcp/compare/v2.7.0...v2.7.1
[2.7.0]: https://github.com/czlonkowski/n8n-mcp/compare/v2.6.3...v2.7.0
[2.6.3]: https://github.com/czlonkowski/n8n-mcp/compare/v2.6.2...v2.6.3
[2.6.2]: https://github.com/czlonkowski/n8n-mcp/compare/v2.6.1...v2.6.2
[2.6.1]: https://github.com/czlonkowski/n8n-mcp/compare/v2.6.0...v2.6.1
[2.6.0]: https://github.com/czlonkowski/n8n-mcp/compare/v2.5.1...v2.6.0
[2.5.1]: https://github.com/czlonkowski/n8n-mcp/compare/v2.5.0...v2.5.1
[2.5.0]: https://github.com/czlonkowski/n8n-mcp/compare/v2.4.2...v2.5.0
[2.4.2]: https://github.com/czlonkowski/n8n-mcp/compare/v2.4.1...v2.4.2
[2.4.1]: https://github.com/czlonkowski/n8n-mcp/compare/v2.4.0...v2.4.1
[2.4.0]: https://github.com/czlonkowski/n8n-mcp/compare/v2.3.3...v2.4.0
[2.3.3]: https://github.com/czlonkowski/n8n-mcp/compare/v2.3.2...v2.3.3
[2.3.2]: https://github.com/czlonkowski/n8n-mcp/compare/v2.3.1...v2.3.2
[2.3.1]: https://github.com/czlonkowski/n8n-mcp/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/czlonkowski/n8n-mcp/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/czlonkowski/n8n-mcp/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/czlonkowski/n8n-mcp/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/czlonkowski/n8n-mcp/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/czlonkowski/n8n-mcp/releases/tag/v1.0.0