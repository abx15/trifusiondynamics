import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message?: string;
  source: string;
  status: 'NEW' | 'CONTACTED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  source: string;
  stage: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class LeadsService {
  private submissions: ContactSubmission[] = [
    {
      id: 'sub_demo_1',
      name: 'Priya Sharma',
      email: 'priya@techventures.io',
      phone: '+91 98765 43210',
      company: 'TechVentures Pvt Ltd',
      subject: 'Custom AI Architecture Consultation',
      message:
        'Looking for a cloud-native microservices architecture and automated AI proposal pipeline setup.',
      source: 'contact-form',
      status: 'NEW',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'sub_demo_2',
      name: 'Rahul Verma',
      email: 'rahul@globalinnovations.com',
      phone: '+91 91234 56789',
      company: 'Global Innovations',
      subject: 'Next.js & NestJS Enterprise Build',
      message:
        'Interested in partnering for a multi-tenant SaaS dashboard redesign.',
      source: 'contact-form',
      status: 'NEW',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ];

  private leads: Lead[] = [
    {
      id: 'lead_demo_1',
      name: 'Ankit Gupta',
      email: 'ankit@startup.io',
      phone: '+91 99887 76655',
      companyName: 'Startup.io',
      source: 'WEBSITE',
      stage: 'CONTACTED',
      notes: 'Initial intro call done.',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
  ];

  async createSubmission(data: any): Promise<ContactSubmission> {
    const newSub: ContactSubmission = {
      id: 'sub_' + randomUUID().slice(0, 8),
      name: data.name || 'Anonymous',
      email: data.email || '',
      phone: data.phone || '',
      company: data.company || '',
      subject: data.subject || '',
      message: data.message || '',
      source: data.source || 'contact-form',
      status: 'NEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.submissions.unshift(newSub);
    return newSub;
  }

  async getSubmissions(query?: { status?: string }) {
    let list = this.submissions;
    if (query?.status) {
      list = list.filter((s) => s.status === query.status);
    }
    return { data: list, total: list.length };
  }

  async getSubmissionById(id: string): Promise<ContactSubmission | null> {
    return this.submissions.find((s) => s.id === id) || null;
  }

  async promoteSubmissionToLead(submissionId: string): Promise<Lead> {
    const sub = await this.getSubmissionById(submissionId);
    if (!sub) {
      const fallbackLead: Lead = {
        id: 'lead_' + randomUUID().slice(0, 8),
        name: 'Inquiry Lead',
        email: 'lead@trifusion.ai',
        source: 'WEBSITE',
        stage: 'NEW',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.leads.unshift(fallbackLead);
      return fallbackLead;
    }

    sub.status = 'CONTACTED';
    sub.updatedAt = new Date().toISOString();

    const newLead: Lead = {
      id: 'lead_' + randomUUID().slice(0, 8),
      name: sub.name,
      email: sub.email,
      phone: sub.phone,
      companyName: sub.company,
      source: 'WEBSITE',
      stage: 'NEW',
      notes: sub.message,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.leads.unshift(newLead);
    return newLead;
  }

  async createLead(data: any): Promise<Lead> {
    const newLead: Lead = {
      id: 'lead_' + randomUUID().slice(0, 8),
      name: data.name,
      email: data.email,
      phone: data.phone,
      companyName: data.company || data.companyName,
      source: data.source || 'WEBSITE',
      stage: data.stage || 'NEW',
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.leads.unshift(newLead);
    return newLead;
  }

  async getLeads() {
    return { data: this.leads, total: this.leads.length, page: 1, limit: 100 };
  }

  async moveStage(id: string, newStage: string) {
    const lead = this.leads.find((l) => l.id === id);
    if (lead) {
      lead.stage = newStage;
      lead.updatedAt = new Date().toISOString();
    }
    return lead || { id, stage: newStage };
  }

  async convertToClient(id: string) {
    const lead = this.leads.find((l) => l.id === id);
    if (lead) {
      lead.stage = 'WON';
    }
    return {
      id: 'client_' + randomUUID().slice(0, 8),
      name: lead?.name || 'New Client',
    };
  }
}
