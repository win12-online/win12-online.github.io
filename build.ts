#!/usr/bin/env -S pnpm exec tsx

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import template from 'art-template';
import { Octokit } from 'octokit';

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));
const distPath = path.join(__dirname, 'dist');

const octokit = new Octokit();

interface User {
  name: string;
  filename: string;
}

async function processUsers(
  contributors: ReturnType<typeof fetchContributors>,
): User[] {
  console.log('Downloading avatars...');
  await fsp.mkdir(path.join(distPath, 'homepage-assets', 'gh-avatar'));
  console.group();
  const users: User[] = [];
  for (let user of contributors) {
    const response = await fetch(user.avatar_url);
    if (!response.ok) {
      throw new Error(`Response is not ok, status code ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let filename = user.login;
    if (response.headers.get('content-type') == 'image/jpeg')
      filename += '.jpg';
    else if (response.headers.get('content-type') == 'image/png')
      filename += '.png';
    else
      throw new Error(
        `Unknown Content-Type: ${response.headers.get('content-type')}`,
      );
    await fsp.writeFile(
      path.join(distPath, 'homepage-assets', 'gh-avatar', filename),
      buffer,
    );
    console.log(`Downloaded avatar of '${user.login}'`);
    users.push({
      name: user.login,
      filename,
    });
  }
  console.groupEnd();
  return users;
}

async function fetchContributors() {
  console.log('Fetching contributors...');
  const contributors = await octokit.paginate(
    'GET /repos/{owner}/{repo}/contributors',
    {
      owner: 'win12-online',
      repo: 'win12',
      headers: {
        'X-GitHub-Api-Version': '2026-03-10',
      },
    },
  );
  console.group();
  console.log('Got contributor list:');
  console.log(contributors);
  console.groupEnd();
  return contributors;
}

(async () => {
  console.log('Starting...');
  console.log('Cleaning output path...');
  if (fs.existsSync(distPath)) {
    await fsp.rm(distPath, { recursive: true });
  }
  console.log('Copying files...');
  await fsp.mkdir(distPath);
  await fsp.cp(
    path.join(__dirname, 'homepage-assets'),
    path.join(distPath, 'homepage-assets'),
    { recursive: true },
  );
  const contributors = await fetchContributors();
  const users = await processUsers(contributors);
  console.log('Rendering index.html...');
  const html = template(path.join(__dirname, 'index.html'), {
    users,
  });
  console.log(html);
  await fsp.writeFile(path.join(distPath, 'index.html'), html);
  console.log('Done!');
})();
