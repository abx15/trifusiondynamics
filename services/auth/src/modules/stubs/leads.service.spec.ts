import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { LeadsService } from './leads.service';
import { PrismaService } from '../database/prisma.service';
import { LeadSource, PipelineStage, SubmissionStatus } from '@prisma/client';

describe('LeadsService tenant isolation', () => {
  let service: LeadsService;
  let dbMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    dbMock = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeadsService, { provide: PrismaService, useValue: dbMock }],
    }).compile();
    service = module.get<LeadsService>(LeadsService);
  });

  it('rejects public submissions without an explicitly resolved organization', async () => {
    await expect(
      service.createSubmission({ name: 'A', email: 'a@example.com', message: 'Hello' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dbMock.contactSubmission.create).not.toHaveBeenCalled();
  });

  it('does not use a body-supplied organization as a fallback', async () => {
    await expect(
      service.createSubmission(
        { name: 'A', email: 'a@example.com', message: 'Hello', organizationId: 'victim-org' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dbMock.contactSubmission.create).not.toHaveBeenCalled();
  });

  it('scopes submission lookup to the requesting organization', async () => {
    dbMock.contactSubmission.findFirst.mockResolvedValue(null);
    await service.getSubmissionById('submission-1', 'org-1');
    expect(dbMock.contactSubmission.findFirst).toHaveBeenCalledWith({
      where: { id: 'submission-1', organizationId: 'org-1' },
    });
  });

  it('does not promote a submission owned by another organization', async () => {
    dbMock.contactSubmission.findFirst.mockResolvedValue(null);
    await expect(
      service.promoteSubmissionToLead('submission-1', 'org-2'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it('creates the client and updates the lead atomically within the organization', async () => {
    const lead = {
      id: 'lead-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: null,
      companyName: 'Example',
      source: LeadSource.WEBSITE,
      stage: PipelineStage.NEW,
      estimatedValue: null,
      notes: null,
      organizationId: 'org-1',
      convertedToClientId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const client = { id: 'client-1', name: lead.name, email: lead.email };
    const tx = {
      lead: {
        findFirst: jest.fn().mockResolvedValue(lead),
        update: jest.fn().mockResolvedValue({ ...lead, stage: PipelineStage.WON, convertedToClientId: client.id }),
      },
      client: { create: jest.fn().mockResolvedValue(client) },
    };
    dbMock.$transaction.mockImplementation(async (callback: any) => callback(tx) as any);

    await expect(service.convertToClient('lead-1', 'org-1')).resolves.toEqual(client);
    expect(tx.lead.findFirst).toHaveBeenCalledWith({
      where: { id: 'lead-1', organizationId: 'org-1' },
    });
    expect(tx.client.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizationId: 'org-1', leadId: 'lead-1' }),
    });
    expect(tx.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1', organizationId: 'org-1' },
      data: { stage: PipelineStage.WON, convertedToClientId: 'client-1' },
    });
  });

  it('uses the same tenant filter when updating a promoted submission', async () => {
    const submission = {
      id: 'submission-1',
      organizationId: 'org-1',
      name: 'Jane',
      email: 'jane@example.com',
      phone: null,
      company: null,
      subject: null,
      message: 'Hello',
      source: 'contact-form',
      status: SubmissionStatus.NEW,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const createdLead = {
      id: 'lead-1',
      name: 'Jane',
      email: 'jane@example.com',
      phone: null,
      companyName: null,
      source: LeadSource.WEBSITE,
      stage: PipelineStage.NEW,
      estimatedValue: null,
      notes: 'Hello',
      organizationId: 'org-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const tx = {
      lead: { create: jest.fn().mockResolvedValue(createdLead) },
      contactSubmission: {
        update: jest.fn().mockResolvedValue({ ...submission, status: SubmissionStatus.CONTACTED }),
      },
    };
    dbMock.contactSubmission.findFirst.mockResolvedValue(submission as any);
    dbMock.$transaction.mockImplementation(async (callback: any) => callback(tx) as any);

    await service.promoteSubmissionToLead('submission-1', 'org-1');
    expect(dbMock.contactSubmission.findFirst).toHaveBeenCalledWith({
      where: { id: 'submission-1', organizationId: 'org-1' },
    });
    expect(tx.contactSubmission.update).toHaveBeenCalledWith({
      where: { id: 'submission-1', organizationId: 'org-1' },
      data: { status: SubmissionStatus.CONTACTED },
    });
  });
});
