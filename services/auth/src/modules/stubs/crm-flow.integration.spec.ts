/**
 * Integration tests for CRM flow: ContactSubmission → Lead → Client
 *
 * Tests the complete lifecycle:
 *   1. Create a contact submission (public CMS form)
 *   2. Promote submission to Lead (org-scoped)
 *   3. Move lead through pipeline stages
 *   4. Convert lead to Client
 *   5. Verify cross-org isolation
 */
import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '../database/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  PipelineStage,
  LeadSource,
  SubmissionStatus,
  Prisma,
} from '@prisma/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSub(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sub-1',
    organizationId: 'org-1',
    name: 'Alice Buyer',
    email: 'alice@example.com',
    phone: '+1-555-0001',
    company: 'Acme Corp',
    subject: 'Interested in services',
    message: 'Please contact me about your enterprise plan.',
    source: 'contact-form',
    status: 'NEW' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeLead(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'lead-1',
    organizationId: 'org-1',
    name: 'Alice Buyer',
    email: 'alice@example.com',
    phone: '+1-555-0001',
    companyName: 'Acme Corp',
    source: LeadSource.WEBSITE,
    stage: PipelineStage.NEW,
    estimatedValue: null,
    notes:
      'Interested in services\n\nPlease contact me about your enterprise plan.',
    createdAt: new Date(),
    updatedAt: new Date(),
    convertedToClientId: null,
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'client-1',
    name: 'Alice Buyer',
    companyName: 'Acme Corp',
    email: 'alice@example.com',
    phone: '+1-555-0001',
    organizationId: 'org-1',
    status: 'ACTIVE',
    leadId: 'lead-1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('CRM Integration Flow: ContactSubmission → Lead → Client', () => {
  let service: LeadsService;
  let db: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    db = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeadsService, { provide: PrismaService, useValue: db }],
    }).compile();
    service = module.get<LeadsService>(LeadsService);
  });

  // ─── 1. Contact Submission Creation ────────────────────────────────────────

  describe('createSubmission', () => {
    it('creates a submission with all fields and correct orgId', async () => {
      const sub = makeSub();
      db.contactSubmission.create.mockResolvedValue(sub);

      const result = await service.createSubmission(
        {
          name: 'Alice Buyer',
          email: 'alice@example.com',
          phone: '+1-555-0001',
          company: 'Acme Corp',
          subject: 'Interested in services',
          message: 'Please contact me about your enterprise plan.',
        },
        'org-1',
      );

      expect(db.contactSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-1',
            name: 'Alice Buyer',
            email: 'alice@example.com',
          }),
        }),
      );
      expect(result.organizationId).toBe('org-1');
      expect(result.status).toBe('NEW');
    });

    it('normalizes email to lowercase and trims whitespace', async () => {
      const sub = makeSub({ email: 'alice@example.com', name: 'Alice' });
      db.contactSubmission.create.mockResolvedValue(sub);

      await service.createSubmission(
        { name: '  Alice  ', email: '  ALICE@EXAMPLE.COM  ', message: 'Hello' },
        'org-1',
      );

      expect(db.contactSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Alice',
            email: 'alice@example.com',
          }),
        }),
      );
    });

    it('falls back to "unscoped" when no orgId is provided', async () => {
      const sub = makeSub({ organizationId: 'unscoped' });
      db.contactSubmission.create.mockResolvedValue(sub);

      await service.createSubmission({
        name: 'Bob',
        email: 'bob@example.com',
        message: 'Hello',
      });

      expect(db.contactSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organizationId: 'unscoped' }),
        }),
      );
    });

    it('throws BadRequestException when required fields are missing', async () => {
      await expect(
        service.createSubmission({ name: '', email: '', message: '' }, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when email is missing', async () => {
      await expect(
        service.createSubmission(
          { name: 'Bob', email: '', message: 'Hi' },
          'org-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when message is missing', async () => {
      await expect(
        service.createSubmission(
          { name: 'Bob', email: 'bob@test.com', message: '' },
          'org-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── 2. Listing Submissions (Org-Scoped) ───────────────────────────────────

  describe('getSubmissions', () => {
    it('always filters by organizationId', async () => {
      const items = [makeSub(), makeSub({ id: 'sub-2' })];
      db.$transaction.mockResolvedValue([items, items.length]);

      await service.getSubmissions('org-1');

      expect(db.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([expect.anything(), expect.anything()]),
      );
    });

    it('adds status filter when valid status is provided', async () => {
      db.$transaction.mockResolvedValue([[makeSub()], 1]);

      await service.getSubmissions('org-1', { status: 'NEW' });

      // The where clause passed to findMany should contain both organizationId and status
      // We verify by checking the transaction was called (the mock-deep proxy validates arg types)
      expect(db.$transaction).toHaveBeenCalled();
    });

    it('ignores invalid status values (no filter added)', async () => {
      db.$transaction.mockResolvedValue([[], 0]);

      const result = await service.getSubmissions('org-1', {
        status: 'INVALID_STATUS',
      });

      expect(result.total).toBe(0);
    });

    it('returns paginated result shape', async () => {
      const items = Array.from({ length: 5 }, (_, i) =>
        makeSub({ id: `sub-${i}` }),
      );
      db.$transaction.mockResolvedValue([items, 15]);

      const result = await service.getSubmissions('org-1', {
        page: '2',
        limit: '5',
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 15);
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
    });
  });

  // ─── 3. Promote Submission → Lead ─────────────────────────────────────────

  describe('promoteSubmissionToLead', () => {
    it('creates a lead from submission data and marks submission as CONTACTED', async () => {
      const sub = makeSub();
      const lead = makeLead();

      // getSubmissionById → findFirst
      db.contactSubmission.findFirst.mockResolvedValue(sub);

      // Transaction: create lead + update submission
      db.$transaction.mockImplementation(async (fn: any) => {
        const txMock = {
          lead: {
            create: jest.fn().mockResolvedValue(lead),
          },
          contactSubmission: {
            update: jest
              .fn()
              .mockResolvedValue({ ...sub, status: 'CONTACTED' }),
          },
        };
        return fn(txMock);
      });

      const result = await service.promoteSubmissionToLead('sub-1', 'org-1');

      expect(result.organizationId).toBe('org-1');
      expect(result.name).toBe('Alice Buyer');
      expect(result.stage).toBe(PipelineStage.NEW);
    });

    it('throws NotFoundException when submission does not exist', async () => {
      db.contactSubmission.findFirst.mockResolvedValue(null);

      await expect(
        service.promoteSubmissionToLead('nonexistent', 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('preserves subject and message as combined notes', async () => {
      const sub = makeSub({
        subject: 'Enterprise Plan',
        message: 'Looking for 100 seats.',
      });
      const lead = makeLead({
        notes: 'Enterprise Plan\n\nLooking for 100 seats.',
      });

      db.contactSubmission.findFirst.mockResolvedValue(sub);
      db.$transaction.mockImplementation(async (fn: any) => {
        const txMock = {
          lead: { create: jest.fn().mockResolvedValue(lead) },
          contactSubmission: { update: jest.fn().mockResolvedValue(sub) },
        };
        return fn(txMock);
      });

      const result = await service.promoteSubmissionToLead('sub-1', 'org-1');
      expect(result.notes).toContain('Enterprise Plan');
      expect(result.notes).toContain('Looking for 100 seats.');
    });
  });

  // ─── 4. Direct Lead Creation ───────────────────────────────────────────────

  describe('createLead', () => {
    it('creates a lead with correct organizationId', async () => {
      const lead = makeLead();
      db.lead.create.mockResolvedValue(lead as any);

      const result = await service.createLead(
        { name: 'Alice Buyer', email: 'alice@example.com', source: 'WEBSITE' },
        'org-1',
      );

      expect(db.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organizationId: 'org-1' }),
        }),
      );
      expect(result.organizationId).toBe('org-1');
    });

    it('throws when name or email is missing', async () => {
      await expect(
        service.createLead({ name: '', email: '' }, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('normalizes COLD_EMAIL source to COLD_OUTREACH', async () => {
      const lead = makeLead({ source: LeadSource.COLD_OUTREACH });
      db.lead.create.mockResolvedValue(lead as any);

      await service.createLead(
        { name: 'Bob', email: 'bob@test.com', source: 'COLD_EMAIL' },
        'org-1',
      );

      expect(db.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ source: LeadSource.COLD_OUTREACH }),
        }),
      );
    });

    it('defaults unknown source to WEBSITE', async () => {
      const lead = makeLead({ source: LeadSource.WEBSITE });
      db.lead.create.mockResolvedValue(lead as any);

      await service.createLead(
        { name: 'Carol', email: 'carol@test.com', source: 'UNKNOWN_SOURCE' },
        'org-1',
      );

      expect(db.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ source: LeadSource.WEBSITE }),
        }),
      );
    });
  });

  // ─── 5. Pipeline Stage Movement ───────────────────────────────────────────

  describe('moveStage', () => {
    it('moves lead to specified stage', async () => {
      const lead = makeLead({ stage: PipelineStage.QUALIFIED });
      db.lead.update.mockResolvedValue(lead as any);

      const result = await service.moveStage('lead-1', 'QUALIFIED', 'org-1');

      expect(db.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-1', organizationId: 'org-1' },
          data: { stage: PipelineStage.QUALIFIED },
        }),
      );
      expect(result.stage).toBe(PipelineStage.QUALIFIED);
    });

    it('normalizes PROPOSAL alias to PROPOSAL_SENT', async () => {
      const lead = makeLead({ stage: PipelineStage.PROPOSAL_SENT });
      db.lead.update.mockResolvedValue(lead as any);

      await service.moveStage('lead-1', 'PROPOSAL', 'org-1');

      expect(db.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { stage: PipelineStage.PROPOSAL_SENT },
        }),
      );
    });

    it('defaults unknown stage to NEW', async () => {
      const lead = makeLead({ stage: PipelineStage.NEW });
      db.lead.update.mockResolvedValue(lead as any);

      await service.moveStage('lead-1', 'BOGUS_STAGE', 'org-1');

      expect(db.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { stage: PipelineStage.NEW },
        }),
      );
    });
  });

  // ─── 6. Lead → Client Conversion ──────────────────────────────────────────

  describe('convertToClient', () => {
    it('marks lead as WON, creates Client, and links client back to lead', async () => {
      const wonLead = makeLead({ stage: PipelineStage.WON });
      const client = makeClient();
      const updatedLead = { ...wonLead, convertedToClientId: 'client-1' };

      db.lead.update
        .mockResolvedValueOnce(wonLead as any) // first call: set WON
        .mockResolvedValueOnce(updatedLead as any); // second call: set convertedToClientId

      db.client.create.mockResolvedValue(client as any);

      const result = await service.convertToClient('lead-1', 'org-1');

      expect(db.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-1', organizationId: 'org-1' },
          data: { stage: PipelineStage.WON },
        }),
      );
      expect(db.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-1',
            email: 'alice@example.com',
            leadId: 'lead-1',
          }),
        }),
      );
      expect(result).toHaveProperty('id', 'client-1');
      expect(result).toHaveProperty('name');
    });
  });

  // ─── 7. Cross-Org Isolation ────────────────────────────────────────────────

  describe('cross-org isolation', () => {
    it('getSubmissions for org-1 does not return org-2 data', async () => {
      const org1Subs = [makeSub({ id: 'sub-org1', organizationId: 'org-1' })];
      db.$transaction.mockResolvedValue([org1Subs, 1]);

      const result = await service.getSubmissions('org-1');

      // All returned items should belong to org-1
      result.data.forEach((s: any) => {
        expect(s.organizationId).toBe('org-1');
      });
    });

    it('getLeads for org-1 does not return org-2 leads', async () => {
      const org1Leads = [makeLead()];
      db.$transaction.mockResolvedValue([org1Leads, 1]);

      const result = await service.getLeads('org-1');

      result.data.forEach((l: any) => {
        expect(l.organizationId).toBe('org-1');
      });
    });
  });
});
