// src/lib/apify-reddit-scraper.ts
// @ts-ignore
// eslint-disable-next-line
declare module 'apify-client';
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN, // Make sure this is set in your environment
});

export async function scrapeRedditThread(url: string, options: any = {}) {
    const run = await client.actor('trudax/reddit-scraper-lite').call({
        startUrls: [{ url }],
        maxComments: options.maxComments || 'all',
        expandReplies: true,
        includeUserData: true,
        sortBy: options.sortBy || 'top',
        proxyConfiguration: { useApifyProxy: true }
    });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return items;
}