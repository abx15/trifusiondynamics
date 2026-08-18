import http from 'k6/http';
import { check, group } from 'k6';
import { thresholds } from '../config/thresholds.js';
import { endpoints } from '../config/endpoints.js';

export const options = {
  scenarios: {
    load: {
      executor: 'shared-iterations',
      vus: 50,
      iterations: 2000,
      maxDuration: '3m',
    },
  },
  thresholds: thresholds,
};

const BASE_URL = 'http://localhost'; // Hits NGINX gateway on port 80
let authToken = null;

export function setup() {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'admin@agencyos.com',
    password: 'password123'
  }), { headers: { 'Content-Type': 'application/json' } });
  
  let token = null;
  if (loginRes.status === 200) {
    try { token = loginRes.json('accessToken'); } catch(e){}
  }
  return { token, leadId: 1, projectId: 1, invoiceId: 1, taskId: 1, clientId: 1, workflowId: 1 };
}

export default function (data) {
  const token = data.token;
  const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
  let url = `${BASE_URL}${ep.path}`;
  if (ep.requiresId) {
    url = url.replace(':id', data[`${ep.requiresId}Id`]);
  }
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
  check(res, { 'is status < 500': (r) => r.status < 500 });
}
