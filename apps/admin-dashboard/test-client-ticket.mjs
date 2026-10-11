import { test } from '@playwright/test';
import * as dotenv from 'dotenv';
import dns from 'dns';
try { dns.setServers(['8.8.8.8', '8.8.4.4']); } catch(e) {}

console.log('Testing setup script');

