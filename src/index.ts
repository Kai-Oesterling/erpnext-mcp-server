#!/usr/bin/env node

/**
 * ERPNext MCP Server v2.0
 * 
 * MCP Server for ERPNext with:
 * - Full CRUD operations (get, create, update, delete, submit, cancel)
 * - DocType management (create, fields, metadata)
 * - Workflow management (get, create, update)
 * - Custom fields and Property Setters
 * - Detailed error handling
 * 
 * Built with MCP SDK 1.25.1
 * 
 * Author: Kai Oesterling <kai@oesterling.org>
 * License: MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ERPNextClient } from './client.js';
import { debugLog } from './utils/errors.js';

// Initialize ERPNext client
const erpnext = new ERPNextClient();

// Create MCP Server
const server = new McpServer(
  {
    name: 'erpnext-mcp-server',
    version: '2.0.0'
  },
  {
    capabilities: {
      resources: {},
      tools: {}
    }
  }
);

// ============================================================================
// RESOURCES
// ============================================================================

// Resource: List all DocTypes
server.registerResource(
  'doctypes',
  'erpnext://DocTypes',
  {
    title: 'All DocTypes',
    description: 'List of all available DocTypes in ERPNext',
    mimeType: 'application/json'
  },
  async () => {
    if (!erpnext.isAuthenticated()) {
      return {
        contents: [{
          uri: 'erpnext://DocTypes',
          text: JSON.stringify({ error: 'Not authenticated with ERPNext' })
        }]
      };
    }
    
    const doctypes = await erpnext.getAllDocTypes();
    return {
      contents: [{
        uri: 'erpnext://DocTypes',
        text: JSON.stringify({ doctypes }, null, 2)
      }]
    };
  }
);

// ============================================================================
// AUTHENTICATION TOOL
// ============================================================================

server.registerTool(
  'authenticate_erpnext',
  {
    title: 'Authenticate with ERPNext',
    description: 'Authenticate with ERPNext using username and password (alternative to API key)',
    inputSchema: {
      username: z.string().describe('ERPNext username'),
      password: z.string().describe('ERPNext password')
    }
  },
  async ({ username, password }) => {
    try {
      const success = await erpnext.authenticate(username, password);
      if (success) {
        return {
          content: [{ type: 'text', text: 'Successfully authenticated with ERPNext' }]
        };
      }
      return {
        content: [{ type: 'text', text: 'Authentication failed' }],
        isError: true
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

// ============================================================================
// DOCUMENT TOOLS
// ============================================================================

server.registerTool(
  'get_document',
  {
    title: 'Get Document',
    description: 'Get a single document by DocType and name',
    inputSchema: {
      doctype: z.string().describe('ERPNext DocType (e.g., Customer, Item)'),
      name: z.string().describe('Document name/ID')
    }
  },
  async ({ doctype, name }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.getDocument(doctype, name);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  'get_documents',
  {
    title: 'Get Documents',
    description: 'Get a list of documents for a specific DocType with optional filtering',
    inputSchema: {
      doctype: z.string().describe('ERPNext DocType (e.g., Customer, Item)'),
      fields: z.array(z.string()).optional().describe('Fields to include'),
      filters: z.record(z.unknown()).optional().describe('Filter conditions as {field: value}'),
      limit: z.number().optional().describe('Maximum number of documents to return')
    }
  },
  async ({ doctype, fields, filters, limit }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.getDocList(doctype, filters, fields, limit);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  'create_document',
  {
    title: 'Create Document',
    description: 'Create a new document in ERPNext',
    inputSchema: {
      doctype: z.string().describe('ERPNext DocType (e.g., Customer, Item)'),
      data: z.record(z.unknown()).describe('Document data')
    }
  },
  async ({ doctype, data }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.createDocument(doctype, data);
      return {
        content: [{ 
          type: 'text', 
          text: `Created ${doctype}: ${(result as { name?: string }).name}\n\n${JSON.stringify(result, null, 2)}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  'update_document',
  {
    title: 'Update Document',
    description: 'Update an existing document in ERPNext',
    inputSchema: {
      doctype: z.string().describe('ERPNext DocType'),
      name: z.string().describe('Document name/ID'),
      data: z.record(z.unknown()).describe('Fields to update')
    }
  },
  async ({ doctype, name, data }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.updateDocument(doctype, name, data);
      return {
        content: [{ 
          type: 'text', 
          text: `Updated ${doctype}: ${name}\n\n${JSON.stringify(result, null, 2)}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  'delete_document',
  {
    title: 'Delete Document',
    description: 'Delete a document from ERPNext',
    inputSchema: {
      doctype: z.string().describe('ERPNext DocType'),
      name: z.string().describe('Document name/ID')
    }
  },
  async ({ doctype, name }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      await erpnext.deleteDocument(doctype, name);
      return {
        content: [{ type: 'text', text: `Deleted ${doctype}: ${name}` }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  'submit_document',
  {
    title: 'Submit Document',
    description: 'Submit a document (Draft → Submitted). Only works for submittable DocTypes.',
    inputSchema: {
      doctype: z.string().describe('ERPNext DocType'),
      name: z.string().describe('Document name/ID')
    }
  },
  async ({ doctype, name }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.submitDocument(doctype, name);
      return {
        content: [{ 
          type: 'text', 
          text: `Submitted ${doctype}: ${name}\n\n${JSON.stringify(result, null, 2)}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  'cancel_document',
  {
    title: 'Cancel Document',
    description: 'Cancel a submitted document',
    inputSchema: {
      doctype: z.string().describe('ERPNext DocType'),
      name: z.string().describe('Document name/ID')
    }
  },
  async ({ doctype, name }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.cancelDocument(doctype, name);
      return {
        content: [{ 
          type: 'text', 
          text: `Cancelled ${doctype}: ${name}\n\n${JSON.stringify(result, null, 2)}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

// ============================================================================
// DOCTYPE TOOLS
// ============================================================================

server.registerTool(
  'get_doctypes',
  {
    title: 'Get DocTypes',
    description: 'Get a list of all available DocTypes in ERPNext',
    inputSchema: {}
  },
  async () => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.getAllDocTypes();
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  'get_doctype_fields',
  {
    title: 'Get DocType Fields',
    description: 'Get field definitions for a specific DocType',
    inputSchema: {
      doctype: z.string().describe('ERPNext DocType')
    }
  },
  async ({ doctype }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.getDocTypeFields(doctype);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  'get_doctype_meta',
  {
    title: 'Get DocType Metadata',
    description: 'Get complete metadata for a DocType including all configuration',
    inputSchema: {
      doctype: z.string().describe('ERPNext DocType')
    }
  },
  async ({ doctype }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.getDocTypeMeta(doctype);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  'create_doctype',
  {
    title: 'Create DocType',
    description: 'Create a new custom DocType in ERPNext',
    inputSchema: {
      name: z.string().describe('DocType name'),
      module: z.string().describe('Module to place the DocType in'),
      fields: z.array(z.object({
        fieldname: z.string(),
        fieldtype: z.string(),
        label: z.string(),
        options: z.string().optional(),
        reqd: z.number().optional(),
        in_list_view: z.number().optional(),
        default: z.string().optional(),
        description: z.string().optional()
      })).describe('Field definitions'),
      is_submittable: z.boolean().optional().describe('Whether documents can be submitted'),
      is_child_table: z.boolean().optional().describe('Whether this is a child table'),
      autoname: z.string().optional().describe('Autoname pattern'),
      title_field: z.string().optional().describe('Field to use as title'),
      permissions: z.array(z.record(z.unknown())).optional().describe('Permission rules')
    }
  },
  async ({ name, module, fields, is_submittable, is_child_table, autoname, title_field, permissions }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.createDocType(name, module, fields, {
        is_submittable,
        is_child_table,
        autoname,
        title_field,
        permissions
      });
      return {
        content: [{ 
          type: 'text', 
          text: `Created DocType: ${name}\n\n${JSON.stringify(result, null, 2)}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  'add_doctype_field',
  {
    title: 'Add DocType Field',
    description: 'Add a custom field to an existing DocType',
    inputSchema: {
      doctype: z.string().describe('Target DocType'),
      fieldname: z.string().describe('Field name (snake_case)'),
      fieldtype: z.string().describe('Field type (Data, Link, Select, etc.)'),
      label: z.string().describe('Field label'),
      options: z.string().optional().describe('Options (for Link: DocType name, for Select: newline-separated values)'),
      reqd: z.number().optional().describe('Required (0 or 1)'),
      insert_after: z.string().optional().describe('Insert after this field'),
      description: z.string().optional().describe('Help text')
    }
  },
  async ({ doctype, fieldname, fieldtype, label, options, reqd, insert_after, description }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.addCustomField(doctype, fieldname, fieldtype, label, {
        options,
        reqd,
        insert_after,
        description
      });
      return {
        content: [{ 
          type: 'text', 
          text: `Added field "${fieldname}" to ${doctype}\n\n${JSON.stringify(result, null, 2)}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  'create_custom_field',
  {
    title: 'Create Custom Field',
    description: 'Create a custom field that survives ERPNext updates',
    inputSchema: {
      doctype: z.string().describe('Target DocType'),
      fieldname: z.string().describe('Field name'),
      fieldtype: z.string().describe('Field type'),
      label: z.string().describe('Field label'),
      options: z.string().optional().describe('Options'),
      insert_after: z.string().optional().describe('Insert after field')
    }
  },
  async ({ doctype, fieldname, fieldtype, label, options, insert_after }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.addCustomField(doctype, fieldname, fieldtype, label, {
        options,
        insert_after
      });
      return {
        content: [{ 
          type: 'text', 
          text: `Created custom field: ${doctype}-${fieldname}\n\n${JSON.stringify(result, null, 2)}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  'create_property_setter',
  {
    title: 'Create Property Setter',
    description: 'Override a DocType or field property',
    inputSchema: {
      doctype: z.string().describe('Target DocType'),
      property: z.string().describe('Property to override'),
      value: z.string().describe('New value'),
      fieldname: z.string().optional().describe('Target field (omit for DocType-level property)')
    }
  },
  async ({ doctype, property, value, fieldname }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.createPropertySetter(doctype, property, value, fieldname);
      return {
        content: [{ 
          type: 'text', 
          text: `Created property setter for ${doctype}${fieldname ? `.${fieldname}` : ''}\n\n${JSON.stringify(result, null, 2)}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

// ============================================================================
// WORKFLOW TOOLS
// ============================================================================

server.registerTool(
  'get_workflow',
  {
    title: 'Get Workflow',
    description: 'Get the active workflow for a DocType',
    inputSchema: {
      doctype: z.string().describe('DocType to get workflow for')
    }
  },
  async ({ doctype }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.getWorkflow(doctype);
      if (result) {
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
      return {
        content: [{ type: 'text', text: `No active workflow found for ${doctype}` }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  'create_workflow',
  {
    title: 'Create Workflow',
    description: 'Create a new workflow for a DocType',
    inputSchema: {
      workflow_name: z.string().describe('Workflow name'),
      document_type: z.string().describe('DocType this workflow applies to'),
      states: z.array(z.object({
        state: z.string(),
        doc_status: z.string().describe('0=Draft, 1=Submitted, 2=Cancelled'),
        allow_edit: z.string().optional().describe('Role that can edit'),
        style: z.string().optional().describe('Badge style (Primary, Success, Warning, Danger)')
      })).describe('Workflow states'),
      transitions: z.array(z.object({
        state: z.string().describe('From state'),
        action: z.string().describe('Action name'),
        next_state: z.string().describe('To state'),
        allowed: z.string().describe('Role allowed to perform this action'),
        condition: z.string().optional().describe('Python condition')
      })).describe('Workflow transitions'),
      is_active: z.boolean().optional().default(true).describe('Whether workflow is active')
    }
  },
  async ({ workflow_name, document_type, states, transitions, is_active }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.createWorkflow(workflow_name, document_type, states, transitions, is_active);
      return {
        content: [{ 
          type: 'text', 
          text: `Created workflow: ${workflow_name}\n\n${JSON.stringify(result, null, 2)}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  'update_workflow',
  {
    title: 'Update Workflow',
    description: 'Update an existing workflow',
    inputSchema: {
      name: z.string().describe('Workflow name'),
      updates: z.record(z.unknown()).describe('Properties to update')
    }
  },
  async ({ name, updates }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.updateWorkflow(name, updates);
      return {
        content: [{ 
          type: 'text', 
          text: `Updated workflow: ${name}\n\n${JSON.stringify(result, null, 2)}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

// ============================================================================
// REPORT TOOL
// ============================================================================

server.registerTool(
  'run_report',
  {
    title: 'Run Report',
    description: 'Execute an ERPNext report and get results',
    inputSchema: {
      report_name: z.string().describe('Name of the report'),
      filters: z.record(z.unknown()).optional().describe('Report filters')
    }
  },
  async ({ report_name, filters }) => {
    if (!erpnext.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated with ERPNext. Configure API key or use authenticate_erpnext.' }],
        isError: true
      };
    }
    
    try {
      const result = await erpnext.runReport(report_name, filters);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error) }],
        isError: true
      };
    }
  }
);

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('ERPNext MCP Server v2.0.0 running on stdio');
  console.error(`Connected to: ${process.env.ERPNEXT_URL}`);
  console.error(`Authentication: ${erpnext.isAuthenticated() ? 'API Key' : 'None (use authenticate_erpnext)'}`);
  console.error(`Debug mode: ${process.env.ERPNEXT_DEBUG === 'true' ? 'enabled' : 'disabled'}`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
