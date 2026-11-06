import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readAppCV } from '../src/local-cms.ts';

test('local reader rejects unsupported locales before accessing the database', async () => {
  await assert.rejects(readAppCV({locale:'fr'}),/Unsupported locale/);
});

test('remote CMS configuration never exposes an interactive browser login', async () => {
  const oldURL=process.env.CMS_API_URL,oldToken=process.env.CMS_TOKEN;
  process.env.CMS_API_URL='https://cms.example.test';delete process.env.CMS_TOKEN;
  try {await assert.rejects(readAppCV({locale:'en'}),/CMS_TOKEN configured on the local app server/);}
  finally {if(oldURL===undefined)delete process.env.CMS_API_URL;else process.env.CMS_API_URL=oldURL;if(oldToken===undefined)delete process.env.CMS_TOKEN;else process.env.CMS_TOKEN=oldToken;}
});
