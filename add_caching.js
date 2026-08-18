const fs = require('fs');

const stubsPath = 'services/auth/src/modules/stubs/stubs.controller.ts';
let content = fs.readFileSync(stubsPath, 'utf8');

// Add Cache imports
content = content.replace(
  "import { Controller, Post, Patch, Param, Body, UseGuards, Get } from '@nestjs/common';",
  "import { Controller, Post, Patch, Param, Body, UseGuards, Get, UseInterceptors } from '@nestjs/common';\nimport { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';"
);

const getEndpoints = `
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600000)
  @Get('cms/services')
  getCmsServices() {
    return [{ id: 'service_1', name: 'Web Dev' }];
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600000)
  @Get('cms/pages/:slug')
  getCmsPage() {
    return { id: 'page_1', title: 'Home' };
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600000)
  @Get('helpdesk/faq')
  getFaq() {
    return [{ id: 'faq_1', question: 'How?' }];
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000)
  @Get('crm/leads')
  getLeads() {
    return [{ id: 'lead_1', name: 'John Doe' }];
  }
`;

// Insert the new endpoints before the end of the class
content = content.replace(/}\s*$/, getEndpoints + '\n}\n');

// Update analytics dashboard to use cache
content = content.replace(
  "@Get('analytics/dashboard')\n  getAnalytics() {",
  "@UseInterceptors(CacheInterceptor)\n  @CacheTTL(300000)\n  @Get('analytics/dashboard')\n  getAnalytics() {"
);

fs.writeFileSync(stubsPath, content);
console.log('Added caching to StubsController');
