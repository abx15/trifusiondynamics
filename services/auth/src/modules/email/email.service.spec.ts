import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { TemplateEngine } from './template.engine';
import { ConsoleProvider } from './email.providers';
import { Queue } from 'bullmq';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });

  it('should render simple template', () => {
    const result = engine.render('Hello {{name}}!', { name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('should render subject', () => {
    const result = engine.renderSubject('Welcome {{user}}', { user: 'John' });
    expect(result).toBe('Welcome John');
  });

  it('should handle missing values', () => {
    const result = engine.render('Hello {{name}}!', {});
    expect(result).toBe('Hello !');
  });

  it('should register and get templates', () => {
    engine.registerTemplate({
      name: 'test',
      subject: 'Test {{name}}',
      html: '<p>Hello {{name}}</p>',
      text: 'Hello {{name}}',
    });

    const template = engine.getTemplate('test');
    expect(template).toBeDefined();
    expect(template?.name).toBe('test');
  });

  it('should render registered template', () => {
    engine.registerTemplate({
      name: 'welcome',
      subject: 'Welcome {{user}}',
      html: '<h1>Welcome {{user}}</h1>',
      text: 'Welcome {{user}}',
    });

    const result = engine.renderTemplate('welcome', { user: 'Alice' });
    expect(result.subject).toBe('Welcome Alice');
    expect(result.html).toBe('<h1>Welcome Alice</h1>');
    expect(result.text).toBe('Welcome Alice');
  });
});

describe('ConsoleProvider', () => {
  let provider: ConsoleProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsoleProvider],
    }).compile();

    provider = module.get<ConsoleProvider>(ConsoleProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should return console as provider name', () => {
    expect(provider.getProviderName()).toBe('console');
  });

  it('should verify connection', async () => {
    const result = await provider.verifyConnection();
    expect(result).toBe(true);
  });

  it('should send email (logs to console)', async () => {
    const result = await provider.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result.provider).toBe('console');
    expect(result.accepted).toContain('test@example.com');
    expect(result.messageId).toContain('console-');
  });
});

describe('EmailService Integration', () => {
  let service: EmailService;
  let mockQueue: Partial<Queue>;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        TemplateEngine,
        ConsoleProvider,
        {
          provide: 'BullQueue_email',
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have active provider', () => {
    expect(service.getActiveProvider()).toBeDefined();
  });

  it('should have send method', () => {
    expect(typeof service.send).toBe('function');
  });

  it('should have sendTemplate method', () => {
    expect(typeof service.sendTemplate).toBe('function');
  });

  it('should have queueEmail method', () => {
    expect(typeof service.queueEmail).toBe('function');
  });

  it('should have suppression list methods', () => {
    expect(typeof service.addSuppression).toBe('function');
    expect(typeof service.removeSuppression).toBe('function');
    expect(typeof service.contains).toBe('function');
    expect(typeof service.listSuppressions).toBe('function');
  });

  it('should have tracking methods', () => {
    expect(typeof service.trackOpen).toBe('function');
    expect(typeof service.trackClick).toBe('function');
    expect(typeof service.getStats).toBe('function');
  });
});