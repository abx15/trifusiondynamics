export const thresholds = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
  'http_req_duration{module:auth}': ['p(95)<300'],
  'http_req_duration{module:ai}': ['p(95)<15000'],
  'http_req_duration{module:general}': ['p(95)<500'],
};
