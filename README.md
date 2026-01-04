# ERPNext MCP Server

MCP (Model Context Protocol) Server for ERPNext with full CRUD operations, workflow management, custom fields, and DocType management.

Built with MCP SDK 1.25.1 - the latest stable version.

## Features

### Document Operations
- `get_document` - Get a single document by DocType and name
- `get_documents` - List documents with filtering, field selection, and pagination
- `create_document` - Create new documents
- `update_document` - Update existing documents
- `delete_document` - Delete documents
- `submit_document` - Submit submittable documents (Draft → Submitted)
- `cancel_document` - Cancel submitted documents

### DocType Management
- `get_doctypes` - List all available DocTypes
- `get_doctype_fields` - Get field definitions for a DocType
- `get_doctype_meta` - Get complete DocType metadata
- `create_doctype` - Create new custom DocTypes
- `add_doctype_field` - Add fields to existing DocTypes
- `create_custom_field` - Create custom fields (survives updates)
- `create_property_setter` - Override DocType/field properties

### Workflow Management
- `get_workflow` - Get active workflow for a DocType
- `create_workflow` - Create new workflows with states and transitions
- `update_workflow` - Update existing workflows

### Reports
- `run_report` - Execute ERPNext reports with filters

### Authentication
- `authenticate_erpnext` - Authenticate with username/password (alternative to API key)

## Installation

```bash
npm install @kai-oesterling/erpnext-mcp-server
```

Or clone and build:

```bash
git clone https://github.com/Kai-Oesterling/erpnext-mcp-server.git
cd erpnext-mcp-server
npm install
npm run build
```

## Configuration

Set environment variables:

```bash
export ERPNEXT_URL=https://erp.example.com
export ERPNEXT_API_KEY=your_api_key
export ERPNEXT_API_SECRET=your_api_secret

# Optional: Enable debug logging
export ERPNEXT_DEBUG=true
```

### Creating API Keys in ERPNext

1. Go to User settings in ERPNext
2. Navigate to "API Access" section
3. Generate new API Key and Secret
4. Use these credentials in environment variables

## Usage

### With Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "erpnext": {
      "command": "node",
      "args": ["/path/to/erpnext-mcp-server/build/index.js"],
      "env": {
        "ERPNEXT_URL": "https://erp.example.com",
        "ERPNEXT_API_KEY": "your_api_key",
        "ERPNEXT_API_SECRET": "your_api_secret"
      }
    }
  }
}
```

### With MCP Inspector

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

### Standalone

```bash
npm start
```

## Development

```bash
# Watch mode
npm run watch

# Run with tsx (no build needed)
npm run dev

# Build
npm run build
```

## Error Handling

This server includes detailed error extraction from ERPNext responses:
- Parses `_server_messages` for validation errors
- Extracts exception details from ERPNext responses
- Provides meaningful HTTP status messages
- Includes debug logging when `ERPNEXT_DEBUG=true`

## Resources

The server also exposes MCP resources:
- `erpnext://DocTypes` - List all available DocTypes
- `erpnext://{doctype}/{name}` - Access individual documents

## License

MIT

## Author

Kai Oesterling <kai@oesterling.org>

## Credits

Based on the original [erpnext-mcp-server](https://github.com/rakeshgangwar/erpnext-mcp-server) by Rakesh Gangwar.
Extended with workflows, custom fields, DocType creation, and improved error handling.
