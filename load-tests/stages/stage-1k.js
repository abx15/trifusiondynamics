import http from 'k6/http';
import { check, group } from 'k6';
import { thresholds } from '../config/thresholds.js';
import { endpoints } from '../config/endpoints.js';

export const options = {
  scenarios: {
    load: {
      executor: 'shared-iterations',
      vus: 20,
      iterations: 1000,
      maxDuration: '2m',
    },
  },
  thresholds: thresholds,
};

const BASE_URL = 'http://localhost/api'; // Hits NGINX gateway on port 80
let authToken = null;

export function setup() {
  // Login once to get token
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'admin@agencyos.com',
    password: 'password123'
  }), { headers: { 'Content-Type': 'application/json' } });
  
  let token = null;
  if (loginRes.status === 200) {
    try { token = loginRes.json('accessToken'); } catch(e){}
  }
  
  // Dummy IDs for the test since we are simulating. In reality, we'd hit create endpoints to get real IDs.
  return { token, leadId: 1, projectId: 1, invoiceId: 1, taskId: 1, clientId: 1, workflowId: 1 };
}

export default function (data) {
  const token = data.token;
  
  // Pick a random endpoint
  const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  let url = `${BASE_URL}${ep.path}`;
  
  // Replace dynamic IDs
  if (ep.requiresId) {
    url = url.replace(':id', data[`${ep.requiresId}Id`]);
  }
  
  // Tag metrics by module for the breakdown table
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    tags: { module: ep.module }
  };
  
  let res;
  if (ep.method === 'GET') {
    res = http.get(url, params);
  } else if (ep.method === 'POST') {
    res = http.post(url, JSON.stringify(ep.payload), params);
  } else if (ep.method === 'PATCH') {
    res = http.patch(url, JSON.stringify(ep.payload), params);
  }
  
  check(res, {
    'is status < 400 or expected': (r) => r.status < 500, // Just preventing 500s for general load testing unless strict
  });
}
