/**
 * ERPNext API Client
 * 
 * Handles all communication with the ERPNext/Frappe REST API.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { formatErrorResponse, debugLog } from './utils/errors.js';

export class ERPNextClient {
  private baseUrl: string;
  private axiosInstance: AxiosInstance;
  private authenticated: boolean = false;

  constructor() {
    this.baseUrl = process.env.ERPNEXT_URL || '';
    
    if (!this.baseUrl) {
      throw new Error('ERPNEXT_URL environment variable is required');
    }
    
    // Remove trailing slash
    this.baseUrl = this.baseUrl.replace(/\/$/, '');
    
    // Initialize axios instance
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
    
    // Configure API key authentication if provided
    const apiKey = process.env.ERPNEXT_API_KEY;
    const apiSecret = process.env.ERPNEXT_API_SECRET;
    
    if (apiKey && apiSecret) {
      this.axiosInstance.defaults.headers.common['Authorization'] = 
        `token ${apiKey}:${apiSecret}`;
      this.authenticated = true;
    }

    // Add response interceptor for debugging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        debugLog('API Response', { url: response.config.url, status: response.status });
        return response;
      },
      (error: AxiosError) => {
        debugLog('API Error', { 
          url: error.config?.url, 
          status: error.response?.status, 
          data: error.response?.data 
        });
        return Promise.reject(error);
      }
    );
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  async authenticate(username: string, password: string): Promise<boolean> {
    try {
      const response = await this.axiosInstance.post('/api/method/login', {
        usr: username,
        pwd: password
      });
      if (response.data.message === 'Logged In') {
        this.authenticated = true;
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(formatErrorResponse('Authentication failed', error as AxiosError));
    }
  }

  // ============================================================================
  // DOCUMENT OPERATIONS
  // ============================================================================

  async getDocument(doctype: string, name: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.axiosInstance.get(
        `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
      );
      return response.data.data;
    } catch (error) {
      throw new Error(formatErrorResponse(`Failed to get ${doctype} "${name}"`, error as AxiosError));
    }
  }

  async getDocList(
    doctype: string, 
    filters?: Record<string, unknown>, 
    fields?: string[], 
    limit?: number
  ): Promise<Record<string, unknown>[]> {
    try {
      const params: Record<string, string | number> = {};
      
      if (fields?.length) {
        params['fields'] = JSON.stringify(fields);
      }
      if (filters && Object.keys(filters).length > 0) {
        params['filters'] = JSON.stringify(filters);
      }
      if (limit) {
        params['limit_page_length'] = limit;
      }
      
      const response = await this.axiosInstance.get(
        `/api/resource/${encodeURIComponent(doctype)}`,
        { params }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(formatErrorResponse(`Failed to get ${doctype} list`, error as AxiosError));
    }
  }

  async createDocument(doctype: string, doc: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      debugLog(`Creating ${doctype}`, doc);
      const response = await this.axiosInstance.post(
        `/api/resource/${encodeURIComponent(doctype)}`,
        doc
      );
      return response.data.data;
    } catch (error) {
      throw new Error(formatErrorResponse(`Failed to create ${doctype}`, error as AxiosError));
    }
  }

  async updateDocument(
    doctype: string, 
    name: string, 
    doc: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      debugLog(`Updating ${doctype} "${name}"`, doc);
      const response = await this.axiosInstance.put(
        `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
        doc
      );
      return response.data.data;
    } catch (error) {
      throw new Error(formatErrorResponse(`Failed to update ${doctype} "${name}"`, error as AxiosError));
    }
  }

  async deleteDocument(doctype: string, name: string): Promise<boolean> {
    try {
      debugLog(`Deleting ${doctype} "${name}"`);
      await this.axiosInstance.delete(
        `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
      );
      return true;
    } catch (error) {
      throw new Error(formatErrorResponse(`Failed to delete ${doctype} "${name}"`, error as AxiosError));
    }
  }

  async submitDocument(doctype: string, name: string): Promise<Record<string, unknown>> {
    try {
      debugLog(`Submitting ${doctype} "${name}"`);
      const response = await this.axiosInstance.post('/api/method/frappe.client.submit', {
        doc: { doctype, name }
      });
      return response.data.message;
    } catch (error) {
      throw new Error(formatErrorResponse(`Failed to submit ${doctype} "${name}"`, error as AxiosError));
    }
  }

  async cancelDocument(doctype: string, name: string): Promise<Record<string, unknown>> {
    try {
      debugLog(`Cancelling ${doctype} "${name}"`);
      const response = await this.axiosInstance.post('/api/method/frappe.client.cancel', {
        doctype,
        name
      });
      return response.data.message;
    } catch (error) {
      throw new Error(formatErrorResponse(`Failed to cancel ${doctype} "${name}"`, error as AxiosError));
    }
  }

  // ============================================================================
  // DOCTYPE OPERATIONS
  // ============================================================================

  async getAllDocTypes(): Promise<string[]> {
    try {
      const response = await this.axiosInstance.get('/api/resource/DocType', {
        params: {
          fields: JSON.stringify(['name']),
          limit_page_length: 0
        }
      });
      return response.data?.data?.map((item: { name: string }) => item.name).sort() || [];
    } catch (error) {
      throw new Error(formatErrorResponse('Failed to get DocTypes', error as AxiosError));
    }
  }

  async getDocTypeFields(doctype: string): Promise<Record<string, unknown>[]> {
    try {
      const response = await this.axiosInstance.get('/api/method/frappe.client.get_list', {
        params: {
          doctype: 'DocField',
          filters: JSON.stringify({ parent: doctype }),
          fields: JSON.stringify([
            'fieldname', 'label', 'fieldtype', 'options', 'reqd', 
            'default', 'description', 'in_list_view', 'read_only', 'hidden', 'idx'
          ]),
          limit_page_length: 0,
          order_by: 'idx asc'
        }
      });
      return response.data.message || [];
    } catch (error) {
      throw new Error(formatErrorResponse(`Failed to get fields for ${doctype}`, error as AxiosError));
    }
  }

  async getDocTypeMeta(doctype: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.axiosInstance.get('/api/method/frappe.desk.form.utils.get_meta', {
        params: { doctype }
      });
      return response.data.message;
    } catch (error) {
      // Fallback: try to get the DocType document directly
      try {
        return await this.getDocument('DocType', doctype);
      } catch {
        throw new Error(formatErrorResponse(`Failed to get metadata for ${doctype}`, error as AxiosError));
      }
    }
  }

  async createDocType(
    name: string, 
    module: string, 
    fields: Record<string, unknown>[], 
    options: {
      is_submittable?: boolean;
      is_child_table?: boolean;
      autoname?: string;
      title_field?: string;
      permissions?: Record<string, unknown>[];
    } = {}
  ): Promise<Record<string, unknown>> {
    try {
      const doc: Record<string, unknown> = {
        doctype: 'DocType',
        name,
        module,
        custom: 1,
        fields,
        is_submittable: options.is_submittable ? 1 : 0,
        istable: options.is_child_table ? 1 : 0
      };
      
      if (options.autoname) doc.autoname = options.autoname;
      if (options.title_field) doc.title_field = options.title_field;
      
      doc.permissions = options.permissions?.length 
        ? options.permissions 
        : [{ role: 'System Manager', read: 1, write: 1, create: 1, delete: 1 }];

      debugLog('Creating DocType', doc);
      const response = await this.axiosInstance.post('/api/resource/DocType', doc);
      return response.data.data;
    } catch (error) {
      throw new Error(formatErrorResponse(`Failed to create DocType "${name}"`, error as AxiosError));
    }
  }

  async addCustomField(
    doctype: string, 
    fieldname: string, 
    fieldtype: string, 
    label: string, 
    options: {
      options?: string;
      reqd?: number;
      insert_after?: string;
      description?: string;
      default?: string;
    } = {}
  ): Promise<Record<string, unknown>> {
    try {
      const doc: Record<string, unknown> = {
        doctype: 'Custom Field',
        dt: doctype,
        fieldname,
        fieldtype,
        label,
        name: `${doctype}-${fieldname}`
      };
      
      if (options.options) doc.options = options.options;
      if (options.reqd !== undefined) doc.reqd = options.reqd;
      if (options.insert_after) doc.insert_after = options.insert_after;
      if (options.description) doc.description = options.description;
      if (options.default) doc.default = options.default;

      debugLog('Creating Custom Field', doc);
      const response = await this.axiosInstance.post('/api/resource/Custom Field', doc);
      return response.data.data;
    } catch (error) {
      throw new Error(formatErrorResponse(`Failed to add custom field "${fieldname}" to ${doctype}`, error as AxiosError));
    }
  }

  async createPropertySetter(
    doctype: string, 
    property: string, 
    value: string, 
    fieldname?: string
  ): Promise<Record<string, unknown>> {
    try {
      const docName = fieldname 
        ? `${doctype}-${fieldname}-${property}` 
        : `${doctype}-main-${property}`;
      
      const doc: Record<string, unknown> = {
        doctype: 'Property Setter',
        name: docName,
        doc_type: doctype,
        property,
        value,
        property_type: 'Data'
      };
      
      if (fieldname) {
        doc.field_name = fieldname;
        doc.doctype_or_field = 'DocField';
      } else {
        doc.doctype_or_field = 'DocType';
      }

      debugLog('Creating Property Setter', doc);
      const response = await this.axiosInstance.post('/api/resource/Property Setter', doc);
      return response.data.data;
    } catch (error) {
      throw new Error(formatErrorResponse(`Failed to create property setter for ${doctype}`, error as AxiosError));
    }
  }

  // ============================================================================
  // WORKFLOW OPERATIONS
  // ============================================================================

  async getWorkflow(doctype: string): Promise<Record<string, unknown> | null> {
    try {
      const response = await this.axiosInstance.get('/api/resource/Workflow', {
        params: {
          filters: JSON.stringify({ document_type: doctype, is_active: 1 }),
          limit_page_length: 1
        }
      });
      
      if (response.data.data?.length > 0) {
        return await this.getDocument('Workflow', response.data.data[0].name);
      }
      return null;
    } catch (error) {
      throw new Error(formatErrorResponse(`Failed to get workflow for ${doctype}`, error as AxiosError));
    }
  }

  async createWorkflow(
    workflowName: string, 
    documentType: string, 
    states: Record<string, unknown>[], 
    transitions: Record<string, unknown>[], 
    isActive: boolean = true
  ): Promise<Record<string, unknown>> {
    try {
      const doc = {
        doctype: 'Workflow',
        workflow_name: workflowName,
        document_type: documentType,
        is_active: isActive ? 1 : 0,
        states,
        transitions
      };
      
      debugLog('Creating Workflow', doc);
      const response = await this.axiosInstance.post('/api/resource/Workflow', doc);
      return response.data.data;
    } catch (error) {
      throw new Error(formatErrorResponse(`Failed to create workflow "${workflowName}"`, error as AxiosError));
    }
  }

  async updateWorkflow(
    name: string, 
    updates: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      debugLog(`Updating Workflow "${name}"`, updates);
      const response = await this.axiosInstance.put(
        `/api/resource/Workflow/${encodeURIComponent(name)}`,
        updates
      );
      return response.data.data;
    } catch (error) {
      throw new Error(formatErrorResponse(`Failed to update workflow "${name}"`, error as AxiosError));
    }
  }

  // ============================================================================
  // REPORTS
  // ============================================================================

  async runReport(
    reportName: string, 
    filters?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.axiosInstance.get('/api/method/frappe.desk.query_report.run', {
        params: {
          report_name: reportName,
          filters: filters ? JSON.stringify(filters) : undefined
        }
      });
      return response.data.message;
    } catch (error) {
      throw new Error(formatErrorResponse(`Failed to run report "${reportName}"`, error as AxiosError));
    }
  }
}
